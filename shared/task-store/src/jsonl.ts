/**
 * @module jsonl
 *
 * Low-level JSONL persistence layer for the task store.
 *
 * Provides two atomic, resilient helpers:
 * - {@link readLines} — deserialises a `.jsonl` file into {@link Task} objects,
 *   skipping malformed lines without throwing.
 * - {@link writeLines} — serialises an array of {@link Task} objects to a
 *   `.jsonl` file via a temp-file rename so readers never see a partial write.
 */

import type { Task } from './types';

import { readFile, rename, writeFile } from 'node:fs/promises';

/**
 * Reads a JSONL file and returns all valid {@link Task} objects.
 *
 * Each line in the file is parsed independently. Lines that are empty or
 * cannot be parsed as JSON are silently skipped. This makes the function
 * resilient to partial writes and corruption without throwing.
 *
 * @param filePath - Absolute or relative path to the `.jsonl` file.
 * @returns A promise that resolves to an array of {@link Task} objects.
 *   Returns an empty array when the file does not exist.
 */
export async function readLines(filePath: string): Promise<Task[]> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const tasks: Task[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isTask(parsed)) {
        tasks.push(parsed);
      }
    } catch {
      // skip malformed lines
    }
  }
  return tasks;
}

/**
 * Atomically overwrites a JSONL file with the given {@link Task} objects.
 *
 * Each task is serialized as a single JSON line. The write is atomic: data is
 * first written to a temporary file next to the target, then renamed into
 * place. This ensures readers never observe a partially-written file.
 *
 * @param filePath - Absolute or relative path to the target `.jsonl` file.
 * @param tasks - The tasks to persist. The file is overwritten entirely.
 */
export async function writeLines(filePath: string, tasks: Task[]): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  const content = tasks.map((t) => JSON.stringify(t)).join('\n') + (tasks.length > 0
    ? '\n'
    : '');
  await writeFile(tmpPath, content, 'utf-8');
  await rename(tmpPath, filePath);
}

interface NodeError extends Error {
  code?: string;
}

function isNodeError(error: unknown): error is NodeError {
  return error instanceof Error && 'code' in error;
}

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['key'] === 'string' &&
    typeof obj['title'] === 'string' &&
    typeof obj['description'] === 'string' &&
    typeof obj['status'] === 'string' &&
    typeof obj['priority'] === 'number' &&
    Array.isArray(obj['blocked_by']) &&
    typeof obj['loop_id'] === 'string' &&
    typeof obj['created_at'] === 'string'
  );
}
