import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTask, getCurrentTask, updateTask } from './tasks.js';

// ---------------------------------------------------------------------------
// Mock Drizzle query builder
// ---------------------------------------------------------------------------

function createMockDb() {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{
      id: 'task-1',
      job_id: 'job-1',
      task_index: 1,
      task_text: 'First task',
      status: 'running',
    }]),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{
      id: 'task-1',
      job_id: 'job-1',
      task_index: 1,
      task_text: 'First task',
      status: 'running',
    }]),
    set: vi.fn().mockReturnThis(),
  };

  return {
    insert: vi.fn().mockReturnValue(chain),
    select: vi.fn().mockReturnValue(chain),
    update: vi.fn().mockReturnValue(chain),
    chain,
  };
}

describe('store/tasks', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.restoreAllMocks();
  });

  describe('createTask', () => {
    it('inserts a task row and returns it', async () => {
      const row = await createTask(db as never, {
        jobId: 'job-1',
        taskIndex: 1,
        taskText: 'First task',
      });

      expect(db.insert).toHaveBeenCalled();
      expect(db.chain.values).toHaveBeenCalledWith(expect.objectContaining({
        job_id: 'job-1',
        task_index: 1,
        task_text: 'First task',
        status: 'running',
      }));
      expect(row).toEqual(expect.objectContaining({ id: 'task-1', status: 'running' }));
    });
  });

  describe('updateTask', () => {
    it('updates status and duration', async () => {
      await updateTask(db as never, 'task-1', {
        status: 'done',
        durationMs: 5000,
      });

      expect(db.update).toHaveBeenCalled();
      expect(db.chain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'done', duration_ms: 5000 }),
      );
    });

    it('updates exit code on failure', async () => {
      await updateTask(db as never, 'task-1', {
        status: 'failed',
        exitCode: 1,
      });

      expect(db.update).toHaveBeenCalled();
      expect(db.chain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', exit_code: 1 }),
      );
    });
  });

  describe('getCurrentTask', () => {
    it('returns null when no running task exists', async () => {
      db.chain.limit.mockResolvedValueOnce([]);

      const result = await getCurrentTask(db as never, 'job-1');
      expect(result).toBeNull();
    });

    it('returns the running task', async () => {
      db.chain.limit.mockResolvedValueOnce([{
        id: 'task-1',
        job_id: 'job-1',
        task_index: 1,
        task_text: 'First task',
        status: 'running',
      }]);

      const result = await getCurrentTask(db as never, 'job-1');
      expect(result).toEqual(expect.objectContaining({ id: 'task-1', status: 'running' }));
    });
  });
});
