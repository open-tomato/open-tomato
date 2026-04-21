import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteWorker,
  findIdleWorker,
  getWorker,
  listWorkers,
  setWorkerStatus,
  upsertWorker,
} from './workers.js';

// ---------------------------------------------------------------------------
// Mock Drizzle query builder
// ---------------------------------------------------------------------------

function createMockDb() {
  const chain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'w-1', status: 'idle', address: 'http://w1:8080' }]),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 'w-1', status: 'idle', address: 'http://w1:8080' }]),
    set: vi.fn().mockReturnThis(),
  };

  return {
    insert: vi.fn().mockReturnValue(chain),
    select: vi.fn().mockReturnValue(chain),
    update: vi.fn().mockReturnValue(chain),
    delete: vi.fn().mockReturnValue(chain),
    chain,
  };
}

describe('store/workers', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.restoreAllMocks();
  });

  describe('upsertWorker', () => {
    it('inserts with onConflictDoUpdate and returns the row', async () => {
      const row = await upsertWorker(db as never, {
        id: 'w-1',
        status: 'idle',
        address: 'http://w1:8080',
      });

      expect(db.insert).toHaveBeenCalled();
      expect(db.chain.values).toHaveBeenCalled();
      expect(db.chain.onConflictDoUpdate).toHaveBeenCalled();
      expect(db.chain.returning).toHaveBeenCalled();
      expect(row).toEqual({ id: 'w-1', status: 'idle', address: 'http://w1:8080' });
    });
  });

  describe('listWorkers', () => {
    it('selects from workers ordered by id', async () => {
      const rows = await listWorkers(db as never);

      expect(db.select).toHaveBeenCalled();
      expect(db.chain.from).toHaveBeenCalled();
      expect(db.chain.orderBy).toHaveBeenCalled();
      expect(rows).toBeDefined();
    });
  });

  describe('getWorker', () => {
    it('returns null when no row matches', async () => {
      db.chain.limit.mockResolvedValueOnce([]);
      // getWorker uses select().from().where() which returns an array
      // We need to override the where call to return empty
      db.chain.where.mockResolvedValueOnce([]);

      const row = await getWorker(db as never, 'nonexistent');
      expect(row).toBeNull();
    });

    it('returns the worker row when found', async () => {
      db.chain.where.mockResolvedValueOnce([{ id: 'w-1', status: 'idle' }]);

      const row = await getWorker(db as never, 'w-1');
      expect(row).toEqual({ id: 'w-1', status: 'idle' });
    });
  });

  describe('findIdleWorker', () => {
    it('returns null when no idle worker exists', async () => {
      db.chain.limit.mockResolvedValueOnce([]);

      const row = await findIdleWorker(db as never);
      expect(row).toBeNull();
    });

    it('returns the first idle worker', async () => {
      db.chain.limit.mockResolvedValueOnce([{ id: 'w-1', status: 'idle' }]);

      const row = await findIdleWorker(db as never);
      expect(row).toEqual({ id: 'w-1', status: 'idle' });
    });
  });

  describe('setWorkerStatus', () => {
    it('updates the status and last_seen_at', async () => {
      await setWorkerStatus(db as never, 'w-1', 'busy');

      expect(db.update).toHaveBeenCalled();
      expect(db.chain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'busy' }),
      );
      expect(db.chain.where).toHaveBeenCalled();
    });
  });

  describe('deleteWorker', () => {
    it('deletes the worker by id', async () => {
      await deleteWorker(db as never, 'w-1');

      expect(db.delete).toHaveBeenCalled();
      expect(db.chain.where).toHaveBeenCalled();
    });
  });
});
