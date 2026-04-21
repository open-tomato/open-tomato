/**
 * @packageDocumentation
 * Shared plan-file utilities used by both the real runner and the simulator.
 *
 * Provides parsing and mutation helpers for `PLAN.md` / `PLAN_TRACKER.md` so
 * the two implementations stay in sync without duplicating logic.
 */

import fs from 'fs';

/** A task entry parsed from `PLAN_TRACKER.md`. */
export interface TaskInfo {
  /** Raw task text with the checkbox syntax stripped. */
  task: string;
  /** 0-indexed line number of this entry in the tracker file. */
  lineNum: number;
  /** Whether the task was previously blocked or is a fresh unchecked item. */
  status: 'blocked' | 'unchecked';
}

/**
 * Returns the next actionable task from tracker file content.
 *
 * Blocked tasks (`- [BLOCKED]`) are preferred over unchecked ones so the loop
 * resumes interrupted work before starting new tasks.
 *
 * @param content - Full text of `PLAN_TRACKER.md`.
 * @returns The next task to run, or `null` when all tasks are done.
 */
export function findNextTask(content: string): TaskInfo | null {
  const lines = content.split('\n');

  // Prefer resuming a blocked task first
  for (let i = 0; i < lines.length; i++) {
    const match = /^- \[BLOCKED\] (.+)/.exec(lines[i] ?? '');
    if (match?.[1]) return { task: match[1].trim(), lineNum: i, status: 'blocked' };
  }

  // Otherwise find the next unchecked task
  for (let i = 0; i < lines.length; i++) {
    const match = /^- \[ \] (.+)/.exec(lines[i] ?? '');
    if (match?.[1]) return { task: match[1].trim(), lineNum: i, status: 'unchecked' };
  }

  return null;
}

/**
 * Counts all task entries (checked, unchecked, and blocked) in plan content.
 *
 * @param content - Full text of `PLAN.md` or `PLAN_TRACKER.md`.
 * @returns Total number of task lines found.
 */
export function countTasks(content: string): number {
  return (content.match(/^- \[[ xX]\]|- \[BLOCKED\]/gm) ?? []).length;
}

/**
 * Rewrites a single task line in the tracker file to reflect its new status.
 *
 * @param trackerPath - Absolute path to `PLAN_TRACKER.md`.
 * @param lineNum - 0-indexed line number to update (from {@link TaskInfo.lineNum}).
 * @param newStatus - `'done'` marks the line `[x]`; `'blocked'` marks it `[BLOCKED]`.
 */
export function updateTrackerLine(
  trackerPath: string,
  lineNum: number,
  newStatus: 'done' | 'blocked',
): void {
  const lines = fs.readFileSync(trackerPath, 'utf8').split('\n');
  const line = lines[lineNum];
  if (!line) return;

  lines[lineNum] =
    newStatus === 'done'
      ? line.replace(/^- \[ \]/, '- [x]').replace(/^- \[BLOCKED\]/, '- [x]')
      : line.replace(/^- \[ \]/, '- [BLOCKED]');

  fs.writeFileSync(trackerPath, lines.join('\n'), 'utf8');
}

/**
 * Assembles the prompt string passed to `claude` for a single task.
 *
 * @param taskText - The scoped task description extracted from the tracker.
 * @param promptContent - Full content of `PROMPT.md`.
 * @param planContent - Full content of `PLAN.md` (for task context).
 * @returns The complete prompt string ready to be piped to stdin.
 */
export function buildPrompt(
  taskText: string,
  promptContent: string,
  planContent: string,
): string {
  return [
    `Your current scoped task is: ${taskText}`,
    'Consider previous tasks listed above this one in PLAN.md checklist as completed. Do not re-evaluate or re-do them. Focus only on the current scoped task.',
    '',
    promptContent,
    planContent,
  ].join('\n');
}
