#!/usr/bin/env bun
/**
 * Start and register task-worker containers with the executor.
 *
 * Discovers running task-worker containers from Docker Compose, waits for
 * their health checks, and registers them with the executor's worker pool
 * via PUT /workers/:workerId { type: 'task-worker' }.
 *
 * Usage:
 *   bun scripts/start-workers.ts                    # discover + register existing containers
 *   bun scripts/start-workers.ts --scale 3          # start 3 workers via compose, then register
 *   bun scripts/start-workers.ts --executor-url http://localhost:4300
 *
 * Environment:
 *   EXECUTOR_URL    — executor base URL (default: http://localhost:4300)
 *   COMPOSE_FILE    — path to docker-compose.yml (default: ./docker-compose.yml)
 */

import process from 'node:process';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface Config {
  executorUrl: string;
  scale: number | null;
  composeFile: string;
}

function parseConfig(): Config {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('--') && i + 1 < args.length) {
      flags[arg.slice(2)] = args[++i]!;
    }
  }

  return {
    executorUrl: flags['executor-url'] ?? process.env['EXECUTOR_URL'] ?? 'http://localhost:4300',
    scale: flags['scale']
      ? Number(flags['scale'])
      : null,
    composeFile: flags['compose-file'] ?? process.env['COMPOSE_FILE'] ?? './docker-compose.yml',
  };
}

// ---------------------------------------------------------------------------
// Subprocess helpers (array-based — no shell injection)
// ---------------------------------------------------------------------------

async function run(
  command: string[],
  options?: { stdio?: 'inherit' | 'pipe' },
): Promise<{ exitCode: number; stdout: string }> {
  const proc = Bun.spawn(command, {
    stdout: options?.stdio === 'inherit'
      ? 'inherit'
      : 'pipe',
    stderr: options?.stdio === 'inherit'
      ? 'inherit'
      : 'pipe',
  });

  const stdout = options?.stdio === 'inherit'
    ? ''
    : await new Response(proc.stdout).text();

  const exitCode = await proc.exited;
  return { exitCode, stdout };
}

// ---------------------------------------------------------------------------
// Docker helpers
// ---------------------------------------------------------------------------

interface ContainerInfo {
  id: string;
  name: string;
  port: number | null;
}

async function startContainers(composeFile: string, scale: number): Promise<void> {
  console.log(`[start-workers] Starting ${scale} task-worker container(s)...`);
  await run(
    ['docker', 'compose', '-f', composeFile, '--profile', 'workers', 'up', '-d', '--scale', `task-worker=${scale}`],
    { stdio: 'inherit' },
  );
}

async function discoverContainers(composeFile: string): Promise<ContainerInfo[]> {
  const { stdout } = await run([
    'docker', 'compose', '-f', composeFile, '--profile', 'workers', 'ps', '--format', 'json', 'task-worker',
  ]);

  if (!stdout.trim()) return [];

  // Docker compose ps --format json outputs one JSON object per line
  return stdout.trim().split('\n')
    .map((line) => {
      try {
        const container = JSON.parse(line) as {
          ID: string;
          Name: string;
          Publishers?: Array<{ PublishedPort: number; TargetPort: number }>;
        };

        const publisher = container.Publishers?.find((p) => p.TargetPort === 4310);
        return {
          id: container.ID.slice(0, 12),
          name: container.Name,
          port: publisher?.PublishedPort ?? null,
        };
      } catch {
        return null;
      }
    })
    .filter((c): c is ContainerInfo => c !== null && c.port !== null);
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

async function waitForHealth(
  baseUrl: string,
  timeoutMs: number = 30_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return true;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  return false;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

async function registerWorker(
  executorUrl: string,
  workerId: string,
  workerUrl: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${executorUrl}/workers/${workerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'task-worker', address: workerUrl }),
    });

    if (res.ok) {
      const body = await res.json() as Record<string, unknown>;
      console.log(`  [${workerId}] registered: ${JSON.stringify(body)}`);
      return true;
    }

    const err = await res.text();
    console.error(`  [${workerId}] registration failed (${res.status}): ${err}`);
    return false;
  } catch (err) {
    console.error(`  [${workerId}] registration error:`, err instanceof Error
      ? err.message
      : err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const config = parseConfig();

// Optionally scale up containers
if (config.scale !== null) {
  await startContainers(config.composeFile, config.scale);
  // Wait a moment for containers to initialize
  await new Promise((r) => setTimeout(r, 2000));
}

// Discover running task-worker containers
const containers = await discoverContainers(config.composeFile);

if (containers.length === 0) {
  console.error('[start-workers] No task-worker containers found. Run with --scale N to start some.');
  process.exit(1);
}

console.log(`[start-workers] Found ${containers.length} task-worker container(s)`);

// Health check and register each
let registered = 0;

for (const container of containers) {
  const workerUrl = `http://localhost:${container.port}`;
  const workerId = `docker-${container.id}`;

  process.stdout.write(`  [${workerId}] Waiting for health at ${workerUrl}...`);
  const healthy = await waitForHealth(workerUrl);

  if (!healthy) {
    console.log(' TIMEOUT');
    continue;
  }
  console.log(' OK');

  const success = await registerWorker(config.executorUrl, workerId, workerUrl);
  if (success) registered++;
}

console.log(`[start-workers] Done. ${registered}/${containers.length} worker(s) registered with executor at ${config.executorUrl}`);

if (registered === 0) {
  process.exit(1);
}
