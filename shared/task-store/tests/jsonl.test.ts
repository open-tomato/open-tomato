import type { Task } from '../src/types';

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readLines, writeLines } from '../src/jsonl';
import { TaskStatus } from '../src/types';

const BASE_TASK: Task = {
  id: 'task-1718000000000-3f2a',
  key: 'design-api-schema',
  title: 'Design API Schema',
  description: 'Define request/response shapes',
  status: TaskStatus.Open,
  priority: 1,
  blocked_by: [],
  loop_id: 'loop-001',
  created_at: '2024-06-10T00:00:00.000Z',
};

async function makeTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'task-store-test-'));
}

describe('readLines', () => {
  it('returns an empty array when the file does not exist', async () => {
    const result = await readLines('/nonexistent/path/to/file.jsonl');
    expect(result).toEqual([]);
  });

  it('returns an empty array for an empty file', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    await writeFile(filePath, '');
    try {
      const result = await readLines(filePath);
      expect(result).toEqual([]);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('parses a single valid line', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    await writeFile(filePath, JSON.stringify(BASE_TASK) + '\n');
    try {
      const result = await readLines(filePath);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(BASE_TASK);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('parses multiple valid lines', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    const task2: Task = { ...BASE_TASK, id: 'task-1718000000001-a1b2', key: 'implement-endpoints', title: 'Implement Endpoints' };
    await writeFile(filePath, [JSON.stringify(BASE_TASK), JSON.stringify(task2)].join('\n') + '\n');
    try {
      const result = await readLines(filePath);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(BASE_TASK);
      expect(result[1]).toEqual(task2);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('skips malformed lines and returns valid ones', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    const lines = [
      JSON.stringify(BASE_TASK),
      'not valid json{{{',
      '',
      '{"incomplete": true}',
      JSON.stringify({ ...BASE_TASK, id: 'task-1718000000002-b3c4', key: 'second-task' }),
    ].join('\n');
    await writeFile(filePath, lines);
    try {
      const result = await readLines(filePath);
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('task-1718000000000-3f2a');
      expect(result[1]!.id).toBe('task-1718000000002-b3c4');
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('skips lines that are valid JSON but not Task objects', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    const lines = [
      '42',
      '"just a string"',
      '{"id": "missing-required-fields"}',
      JSON.stringify(BASE_TASK),
    ].join('\n');
    await writeFile(filePath, lines);
    try {
      const result = await readLines(filePath);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(BASE_TASK);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});

describe('writeLines', () => {
  it('creates the file and round-trips tasks through readLines', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    const task2: Task = { ...BASE_TASK, id: 'task-1718000000001-a1b2', key: 'second-task', title: 'Second Task' };
    try {
      await writeLines(filePath, [BASE_TASK, task2]);
      const result = await readLines(filePath);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(BASE_TASK);
      expect(result[1]).toEqual(task2);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('overwrites existing content', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    const task2: Task = { ...BASE_TASK, id: 'task-1718000000001-a1b2', key: 'second-task', title: 'Second Task' };
    try {
      await writeLines(filePath, [BASE_TASK, task2]);
      await writeLines(filePath, [task2]);
      const result = await readLines(filePath);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(task2);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('writes an empty file when given an empty array', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    try {
      await writeLines(filePath, []);
      const result = await readLines(filePath);
      expect(result).toEqual([]);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('preserves optional fields in round-trip', async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, 'tasks.jsonl');
    const taskWithDates: Task = {
      ...BASE_TASK,
      status: TaskStatus.Closed,
      started_at: '2024-06-10T00:01:00.000Z',
      closed_at: '2024-06-10T00:05:00.000Z',
    };
    try {
      await writeLines(filePath, [taskWithDates]);
      const result = await readLines(filePath);
      expect(result[0]).toEqual(taskWithDates);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
