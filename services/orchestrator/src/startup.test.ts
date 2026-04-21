import { beforeEach, describe, expect, it, vi } from 'vitest';

import { recoverInterruptedJobs } from './startup.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('./store/jobs.js', () => ({
  findActiveJobs: vi.fn(),
  updateJobStatus: vi.fn(),
}));
 
const { findActiveJobs, updateJobStatus } = await import('./store/jobs.js') as {
  findActiveJobs: ReturnType<typeof vi.fn>;
  updateJobStatus: ReturnType<typeof vi.fn>;
};

function createMockNotify() {
  return {
    emitEvent: vi.fn().mockResolvedValue({}),
    requestApproval: vi.fn().mockResolvedValue({ decision: 'granted' }),
  };
}

describe('recoverInterruptedJobs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    findActiveJobs.mockResolvedValue([]);
    updateJobStatus.mockResolvedValue(undefined);
  });

  it('does nothing when no active jobs exist', async () => {
    const notify = createMockNotify();
    await recoverInterruptedJobs(null as never, notify, 'local');

    expect(findActiveJobs).toHaveBeenCalled();
    expect(updateJobStatus).not.toHaveBeenCalled();
    expect(notify.emitEvent).not.toHaveBeenCalled();
  });

  it('transitions running jobs to blocked', async () => {
    findActiveJobs.mockResolvedValue([
      { id: 'job-1', status: 'running' },
      { id: 'job-2', status: 'paused' },
    ]);

    const notify = createMockNotify();
    await recoverInterruptedJobs(null as never, notify, 'node-1');

    expect(updateJobStatus).toHaveBeenCalledTimes(2);
    expect(updateJobStatus).toHaveBeenCalledWith(
      null,
      'job-1',
      'blocked',
      expect.objectContaining({ completed_at: expect.any(Date) }),
    );
    expect(updateJobStatus).toHaveBeenCalledWith(
      null,
      'job-2',
      'blocked',
      expect.objectContaining({ completed_at: expect.any(Date) }),
    );
  });

  it('emits loop.cancelled events to notifications', async () => {
    findActiveJobs.mockResolvedValue([
      { id: 'job-1', status: 'running' },
    ]);

    const notify = createMockNotify();
    await recoverInterruptedJobs(null as never, notify, 'node-1');

    expect(notify.emitEvent).toHaveBeenCalledWith(
      'job-1',
      'node-1',
      expect.objectContaining({
        type: 'loop.cancelled',
        reason: 'executor restarted — job interrupted',
      }),
    );
  });
});
