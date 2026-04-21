#!/usr/bin/env bun
/**
 * Task-worker CLI entry point.
 *
 * Provides the same operations as the HTTP server but as CLI subcommands.
 * The executor's `TaskWorkerCliClient` spawns this in local mode.
 *
 * Usage:
 *   bun cli.ts exec --prompt "..." --work-dir /path [--model sonnet]
 *   bun cli.ts workspace-prepare --branch feature/x --dir /tmp/worker-1
 *   bun cli.ts workspace-clean --dir /tmp/worker-1
 *   bun cli.ts instinct-flush [--orchestrator-url http://...]
 *   bun cli.ts health
 */

import process from 'node:process';

import { APPROVED_PRESETS, CLI_EXIT_CODES } from '@open-tomato/worker-protocol';

import {
  execCommand,
  healthCommand,
  workspaceCleanCommand,
  workspacePrepareCommand,
} from './src/cli/commands.js';
import { writeDiag } from './src/cli/output.js';
import { flushInstincts } from './src/core/instinct-lifecycle.js';

// ---------------------------------------------------------------------------
// Argument parsing (minimal — no external deps)
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { subcommand: string; flags: Record<string, string> } {
  const subcommand = argv[2] ?? '';
  const flags: Record<string, string> = {};

  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--') && i + 1 < argv.length) {
      const key = arg.slice(2);
      flags[key] = argv[++i]!;
    }
  }

  return { subcommand, flags };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const WORKER_ID = process.env['WORKER_ID'] ?? 'task-worker-cli';
const DEFAULT_MODEL = process.env['DEFAULT_MODEL'] ?? 'sonnet';

const { subcommand, flags } = parseArgs(process.argv);

let exitCode: number;

switch (subcommand) {
  case 'exec':
    if (!flags['prompt'] || !flags['work-dir']) {
      writeDiag('Usage: cli.ts exec --prompt "..." --work-dir /path [--model sonnet]');
      exitCode = CLI_EXIT_CODES.INVALID_ARGS;
      break;
    }
    exitCode = await execCommand(
      {
        prompt: flags['prompt'],
        workDir: flags['work-dir'],
        model: flags['model'],
      },
      DEFAULT_MODEL,
    );
    break;

  case 'workspace-prepare':
    if (!flags['branch'] || !flags['dir']) {
      writeDiag('Usage: cli.ts workspace-prepare --branch <branch> --dir <path> [--repo-url <url>]');
      exitCode = CLI_EXIT_CODES.INVALID_ARGS;
      break;
    }
    exitCode = await workspacePrepareCommand({
      branch: flags['branch'],
      dir: flags['dir'],
      repoUrl: flags['repo-url'],
    });
    break;

  case 'workspace-clean':
    if (!flags['dir']) {
      writeDiag('Usage: cli.ts workspace-clean --dir <path>');
      exitCode = CLI_EXIT_CODES.INVALID_ARGS;
      break;
    }
    exitCode = await workspaceCleanCommand({ dir: flags['dir'] });
    break;

  case 'instinct-flush': {
    const orchestratorUrl = flags['orchestrator-url'] ?? process.env['ORCHESTRATOR_URL'];
    try {
      await flushInstincts(orchestratorUrl, WORKER_ID);
      exitCode = CLI_EXIT_CODES.SUCCESS;
    } catch {
      exitCode = CLI_EXIT_CODES.INSTINCT_FLUSH_FAILED;
    }
    break;
  }

  case 'health':
    exitCode = healthCommand(WORKER_ID, APPROVED_PRESETS);
    break;

  default:
    writeDiag(
      `Unknown subcommand '${subcommand}'. Available: exec, workspace-prepare, workspace-clean, instinct-flush, health`,
    );
    exitCode = CLI_EXIT_CODES.INVALID_ARGS;
    break;
}

process.exit(exitCode);
