import type { PrerequisiteItem } from './parser.js';
import type { NotificationClient } from '../notifications/client.js';

import { randomUUID } from 'crypto';

/**
 * Result of checking a single prerequisite item.
 */
export interface CheckResult {
  item: PrerequisiteItem;
  result: 'pass' | 'fail' | 'escalated' | 'denied';
  error?: string;
}

// ---------------------------------------------------------------------------
// Auto probe
// ---------------------------------------------------------------------------

/**
 * Runs a shell command and returns true if it exits with code 0.
 */
async function runProbe(command: string, workDir: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(command.split(/\s+/), {
      cwd: workDir,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Attempts a one-shot atomic claude invocation to fix an auto-check failure.
 * This is NOT the main loop — it is a single scoped invocation.
 * Returns true if the subsequent re-probe passes.
 */
async function attemptAtomicFix(
  item: PrerequisiteItem,
  workDir: string,
): Promise<boolean> {
  if (!item.probeCommand) return false;

  const fixPrompt = [
    'A prerequisite check failed for this item:',
    `  ${item.description}`,
    '',
    `The probe command that failed: \`${item.probeCommand}\``,
    '',
    'Please resolve this issue so the probe command passes.',
    'This is a single atomic task — do not modify any application code.',
    'Only fix the specific prerequisite described above.',
  ].join('\n');

  try {
    const proc = Bun.spawn(['claude', '-p', '--dangerously-skip-permissions'], {
      stdin: new TextEncoder().encode(fixPrompt),
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: workDir,
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) return false;

    // Re-probe after the fix attempt
    return runProbe(item.probeCommand, workDir);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs all prerequisite checks before the main loop starts.
 *
 * - `[auto]` with a probeCommand: runs the probe. On failure, attempts an
 *   atomic claude fix then re-probes. If still failing, escalates to a
 *   [human] approval request.
 * - `[auto]` without a probeCommand: conservatively escalated to [human].
 * - `[human]`: emits `prerequisite.check { result: 'pending' }` and blocks
 *   until a human grants or denies via the notification service.
 *
 * Returns `false` if any item is denied or irrecoverably failed.
 * Returns `true` when all items have passed or been approved.
 */
export async function checkPrerequisites(
  items: PrerequisiteItem[],
  jobId: string,
  nodeId: string,
  workDir: string,
  notify: NotificationClient,
): Promise<boolean> {
  for (const item of items) {
    if (item.tag === 'auto' && item.probeCommand) {
      // ── Auto probe ────────────────────────────────────────────────────────

      await notify.emitEvent(jobId, nodeId, {
        type: 'prerequisite.check',
        item: item.description,
        tag: 'auto',
        result: 'pending',
      });

      const passed = await runProbe(item.probeCommand, workDir);

      if (passed) {
        await notify.emitEvent(jobId, nodeId, {
          type: 'prerequisite.check',
          item: item.description,
          tag: 'auto',
          result: 'pass',
        });
        continue;
      }

      // Probe failed — attempt atomic fix
      await notify.emitEvent(jobId, nodeId, {
        type: 'prerequisite.check',
        item: item.description,
        tag: 'auto',
        result: 'fail',
      });

      const fixed = await attemptAtomicFix(item, workDir);

      if (fixed) {
        await notify.emitEvent(jobId, nodeId, {
          type: 'prerequisite.check',
          item: item.description,
          tag: 'auto',
          result: 'pass',
        });
        continue;
      }

      // Fix attempt failed — escalate to human
      console.warn(
        `[checker] auto-fix failed for "${item.description}" — escalating to human approval`,
      );
    }

    // ── Human approval (explicit or escalated from failed auto) ────────────

    await notify.emitEvent(jobId, nodeId, {
      type: 'prerequisite.check',
      item: item.description,
      tag: 'human',
      result: 'pending',
    });

    const decision = await notify.requestApproval(jobId, nodeId, {
      requestId: randomUUID(),
      type: 'prerequisite',
      description: item.description,
    });

    if (decision.decision === 'denied') {
      await notify.emitEvent(jobId, nodeId, {
        type: 'prerequisite.check',
        item: item.description,
        tag: 'human',
        result: 'fail',
      });
      return false;
    }

    await notify.emitEvent(jobId, nodeId, {
      type: 'prerequisite.check',
      item: item.description,
      tag: 'human',
      result: 'pass',
    });
  }

  return true;
}
