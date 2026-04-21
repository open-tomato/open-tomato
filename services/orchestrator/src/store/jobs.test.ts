import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createJob,
  findActiveJobs,
  getJob,
  listJobs,
  updateJobStatus,
  updateJobTaskCounts,
} from './jobs.js';

// ---------------------------------------------------------------------------
// Mock Drizzle query builder
// ---------------------------------------------------------------------------

function createMockDb() {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{
      id: 'job-1',
      status: 'pending',
      source_id: 'plan-1',
      branch: 'main',
    }]),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{
      id: 'job-1',
      status: 'pending',
      source_id: 'plan-1',
      branch: 'main',
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

describe('store/jobs', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.restoreAllMocks();
  });

  describe('createJob', () => {
    it('inserts a job and returns the row', async () => {
      const row = await createJob(db as never, {
        source_id: 'plan-1',
        branch: 'main',
        status: 'pending',
      });

      expect(db.insert).toHaveBeenCalled();
      expect(db.chain.values).toHaveBeenCalled();
      expect(db.chain.returning).toHaveBeenCalled();
      expect(row).toEqual(expect.objectContaining({ id: 'job-1', status: 'pending' }));
    });
  });

  describe('getJob', () => {
    it('returns null when no job matches', async () => {
      db.chain.where.mockResolvedValueOnce([]);

      const row = await getJob(db as never, 'nonexistent');
      expect(row).toBeNull();
    });

    it('returns the job row when found', async () => {
      db.chain.where.mockResolvedValueOnce([{ id: 'job-1', status: 'running' }]);

      const row = await getJob(db as never, 'job-1');
      expect(row).toEqual({ id: 'job-1', status: 'running' });
    });
  });

  describe('listJobs', () => {
    it('returns jobs ordered by created_at desc', async () => {
      const rows = await listJobs(db as never);

      expect(db.select).toHaveBeenCalled();
      expect(db.chain.from).toHaveBeenCalled();
      expect(rows).toBeDefined();
    });

    it('filters by statuses when provided', async () => {
      await listJobs(db as never, { statuses: ['running', 'paused'] });

      expect(db.chain.where).toHaveBeenCalled();
    });
  });

  describe('updateJobTaskCounts', () => {
    it('updates plan and prereq task counts', async () => {
      await updateJobTaskCounts(db as never, 'job-1', 10, 3);

      expect(db.update).toHaveBeenCalled();
      expect(db.chain.set).toHaveBeenCalledWith(
        expect.objectContaining({ plan_tasks_count: 10, prereq_tasks_count: 3 }),
      );
    });
  });

  describe('updateJobStatus', () => {
    it('updates status with optional timestamps', async () => {
      const now = new Date();
      await updateJobStatus(db as never, 'job-1', 'running', { started_at: now });

      expect(db.update).toHaveBeenCalled();
      expect(db.chain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'running', started_at: now }),
      );
    });
  });

  describe('findActiveJobs', () => {
    it('returns jobs in running or paused state', async () => {
      db.chain.where.mockResolvedValueOnce([
        { id: 'job-1', status: 'running' },
        { id: 'job-2', status: 'paused' },
      ]);

      const rows = await findActiveJobs(db as never);
      expect(rows).toHaveLength(2);
    });
  });
});
