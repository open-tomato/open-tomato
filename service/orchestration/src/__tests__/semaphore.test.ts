import { describe, expect, it } from 'bun:test';

import { Semaphore } from '../wave/semaphore.js';

describe('Semaphore', () => {
  it('allows up to N concurrent acquisitions', async () => {
    const sem = new Semaphore(3);

    await sem.acquire();
    await sem.acquire();
    await sem.acquire();

    expect(sem.available).toBe(0);
  });

  it('queues additional callers beyond the limit', async () => {
    const sem = new Semaphore(1);
    await sem.acquire();

    let queued = false;
    const pending = sem.acquire().then(() => {
      queued = true;
    });

    // Let microtasks flush — the queued caller should still be blocked
    await Promise.resolve();
    expect(queued).toBe(false);

    sem.release();
    await pending;
    expect(queued).toBe(true);
  });

  it('releases the next caller in queue on release()', async () => {
    const sem = new Semaphore(1);
    await sem.acquire();

    const order: number[] = [];

    const p1 = sem.acquire().then(() => order.push(1));
    const p2 = sem.acquire().then(() => order.push(2));

    sem.release();
    await p1;

    sem.release();
    await p2;

    expect(order).toEqual([1, 2]);
  });

  it('reports correct available count at each state', async () => {
    const sem = new Semaphore(2);
    expect(sem.available).toBe(2);

    await sem.acquire();
    expect(sem.available).toBe(1);

    await sem.acquire();
    expect(sem.available).toBe(0);

    sem.release();
    expect(sem.available).toBe(1);

    sem.release();
    expect(sem.available).toBe(2);
  });

  it('increments permits on release when queue is empty', () => {
    const sem = new Semaphore(1);
    sem.release();
    expect(sem.available).toBe(2);
  });

  it('handles high contention correctly', async () => {
    const sem = new Semaphore(2);
    let running = 0;
    let maxRunning = 0;

    const worker = async (): Promise<void> => {
      await sem.acquire();
      running++;
      if (running > maxRunning) maxRunning = running;
      // Simulate async work
      await new Promise((r) => setTimeout(r, 5));
      running--;
      sem.release();
    };

    await Promise.all(Array.from({ length: 6 }, () => worker()));

    expect(maxRunning).toBeLessThanOrEqual(2);
    expect(sem.available).toBe(2);
  });
});
