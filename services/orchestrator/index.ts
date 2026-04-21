import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createService } from '@open-tomato/express';
import { validatePreset } from '@open-tomato/worker-protocol';

import { createDbDependency } from './src/db/index.js';
import { createLoopDependency } from './src/loop/dependency.js';
import { createLoopDependency as createSimulatorDependency } from './src/loop/simulator.js';
import { createNotificationClient } from './src/notifications/client.js';
import { jobsRouter } from './src/routes/jobs.js';
import { workersRouter } from './src/routes/workers.js';
import {
  NdjsonTransport,
  RpcCommandHandler,
  RpcEventBus,
  RpcServer,
} from './src/rpc/index.js';
import { recoverInterruptedJobs } from './src/startup.js';
import { BackendDetector } from './src/workers/backend-detector.js';
import { BackendFactory } from './src/workers/backend-factory.js';
import { CircuitBreaker } from './src/workers/circuit-breaker.js';
import { FallbackChainWorkerClient } from './src/workers/fallback-chain-worker-client.js';
import { WorkerPool } from './src/workers/pool.js';
import { StubWorkerClient } from './src/workers/stub.js';
import { TaskWorkerCliClient } from './src/workers/task-worker-cli-client.js';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const PORT = Number(process.env['PORT'] ?? 4300);
const NODE_ID = process.env['NODE_ID'] ?? 'local';
const REPO_PATH = process.env['REPO_PATH'] ?? process.cwd();
const NOTIFICATION_URL = process.env['NOTIFICATION_URL'];
const DATABASE_URL = process.env['DATABASE_URL'] ?? 'postgresql://executor:executor@localhost:5434/executor';
const DRY_RUN = process.argv.includes('--dry-run') || process.env['DRY_RUN'] === 'true';
const RPC_ENABLED = process.argv.includes('--rpc') || process.env['RPC'] === 'true';
const WORKER_MODE = process.env['WORKER_MODE'] ?? 'local';
const RUN_MODE = process.env['RUN_MODE'];
const DEFAULT_MODEL = process.env['DEFAULT_MODEL'] ?? 'sonnet';
const TASK_WORKER_CLI_PATH = process.env['TASK_WORKER_CLI_PATH']
  ?? path.resolve(import.meta.dir, '../task-worker/cli.ts');
const MAX_LOCAL_WORKERS = Number(process.env['MAX_LOCAL_WORKERS'] ?? 1);
const LOCAL_PLAN_FILE = process.env['LOCAL_PLAN_FILE'];

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const notify = createNotificationClient(NOTIFICATION_URL);
const dbDep = createDbDependency(DATABASE_URL);
const loopFactory = DRY_RUN
  ? createSimulatorDependency
  : createLoopDependency;

if (DRY_RUN) {
  console.log('[executor] simulation mode enabled — no claude invocations will be made');
}

// ---------------------------------------------------------------------------
// RPC Server (optional — activated with --rpc flag)
// ---------------------------------------------------------------------------

let rpcServer: RpcServer | undefined;
let rpcBus: RpcEventBus | undefined;

if (RPC_ENABLED) {
  rpcBus = new RpcEventBus();

  const noop = () => { /* stub — wired to orchestrator hooks in later tasks */ };
  const noopAsync = async () => { noop(); };

  const handler = new RpcCommandHandler({
    bus: rpcBus,
    hooks: {
      onPrompt: noopAsync,
      onGuidance: noopAsync,
      onSteer: noopAsync,
      onFollowUp: noopAsync,
      onAbort: noopAsync,
      onGetState: () => ({ status: 'idle' }),
      onGetIterations: noopAsync,
      onSetHat: noopAsync,
    },
  });

  const transport = new NdjsonTransport(process.stdin, process.stdout);

  rpcServer = new RpcServer({ transport, bus: rpcBus, handler });
  rpcServer.start().catch((err: unknown) => {
    console.error('[executor] rpc server error', err);
  });

  console.log('[executor] rpc server enabled — listening on stdin/stdout');
}

await createService({
  serviceId: 'executor',
  port: PORT,
  dependencies: [dbDep],

  async register(app, ctx) {
    const db = ctx.deps.get(dbDep);

    // Recover jobs interrupted by a prior executor crash/restart
    await recoverInterruptedJobs(db, notify, NODE_ID);

    // Create worker pool and auto-register a default worker
    const pool = new WorkerPool(db);
    const defaultWorkerId = `${NODE_ID}-worker-0`;

    if (DRY_RUN) {
      await pool.register(new StubWorkerClient(defaultWorkerId), 'stub');
    } else if (RUN_MODE === 'local') {
      // ── New path: TaskWorkerCliClient (Claude-only + model presets) ───
      const preset = validatePreset(DEFAULT_MODEL);
      const workerCount = Math.max(1, MAX_LOCAL_WORKERS);

      for (let i = 0; i < workerCount; i++) {
        const workerId = `${NODE_ID}-worker-${i}`;
        const cliClient = new TaskWorkerCliClient(
          workerId,
          TASK_WORKER_CLI_PATH,
          preset.name,
        );
        await pool.register(cliClient, 'local-cli');
      }

      console.log(`[executor] RUN_MODE=local workers=${workerCount} model=${preset.name} cli=${TASK_WORKER_CLI_PATH}`);
    } else if (RUN_MODE === 'docker' || RUN_MODE === 'remote') {
      // ── Docker/remote: workers self-register via PUT /workers/:workerId
      console.log(`[executor] RUN_MODE=${RUN_MODE} — waiting for workers to register via PUT /workers/:workerId { type: 'task-worker' }`);
    } else if (RUN_MODE === 'serverless') {
      // ── Serverless: stub for future implementation ────────────────────
      console.log('[executor] RUN_MODE=serverless — not yet implemented, no workers registered');
    } else if (!RUN_MODE && WORKER_MODE === 'local') {
      // ── Deprecated path: FallbackChainWorkerClient (multi-backend) ───
      const detector = new BackendDetector();
      const allCandidates = ['claude', 'gemini', 'codex'] as const;
      const available = await detector.detect([...allCandidates]);
      console.log(`[executor] [deprecated WORKER_MODE] detected backends: ${available.length > 0
        ? available.join(', ')
        : 'none'}`);

      const backends = available
        .map((name) => BackendFactory.create(name as 'claude' | 'gemini' | 'codex'))
        .filter(Boolean);

      if (backends.length === 0) {
        console.warn('[executor] no backends detected — falling back to claude descriptor without availability check');
        backends.push(BackendFactory.create('claude'));
      }

      const circuitBreaker = new CircuitBreaker();
      const fallbackClient = new FallbackChainWorkerClient(
        defaultWorkerId,
        backends,
        circuitBreaker,
        detector,
      );
      await pool.register(fallbackClient, REPO_PATH);
    }
    // Additional workers can be registered at runtime via PUT /workers/:workerId

    app.use('/jobs', jobsRouter({ notify, nodeId: NODE_ID, repoPath: REPO_PATH, loopFactory, db, pool, rpcBus }));
    app.use('/workers', workersRouter({ pool, db }));

    // ── Standalone mode: auto-dispatch from a local plan file ──────────────
    if (LOCAL_PLAN_FILE) {
      console.log(`[executor] standalone mode — loading plan from ${LOCAL_PLAN_FILE}`);
      try {
        const content = fs.readFileSync(LOCAL_PLAN_FILE, 'utf8');
        const taskLines: Array<{ index: number; text: string }> = [];
        const lines = content.split('\n');
        let idx = 0;
        for (const line of lines) {
          const match = /^- \[[ xX]\] (.+)|^- \[BLOCKED\] (.+)/.exec(line);
          if (match) {
            const text = (match[1] ?? match[2] ?? '').trim();
            taskLines.push({ index: idx, text });
            idx++;
          }
        }

        if (taskLines.length === 0) {
          console.warn('[executor] standalone mode — no tasks found in plan file');
        } else {
          // Self-dispatch via the local HTTP endpoint
          const baseUrl = `http://localhost:${PORT}`;
          const dispatchRes = await fetch(`${baseUrl}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planId: LOCAL_PLAN_FILE,
              plan: {
                name: LOCAL_PLAN_FILE.split('/').pop() ?? 'local-plan',
                tasks: taskLines,
              },
            }),
          });
          const body = await dispatchRes.json() as Record<string, unknown>;
          if (dispatchRes.ok) {
            console.log(`[executor] standalone mode — dispatched job ${body['jobId']} with ${taskLines.length} tasks`);
          } else {
            console.error(`[executor] standalone mode — dispatch failed: ${JSON.stringify(body)}`);
          }
        }
      } catch (err) {
        console.error('[executor] standalone mode — failed to load plan file:', err);
      }
    }
  },
});
