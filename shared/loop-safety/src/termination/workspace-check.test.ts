import { describe, expect, it, mock } from 'bun:test';

import { createWorkspaceExistsCheck } from './workspace-check';

describe('createWorkspaceExistsCheck', () => {
  it('returns true when access resolves', async () => {
    const accessFn = mock(() => Promise.resolve());
    const check = createWorkspaceExistsCheck('/some/workspace', accessFn);
    expect(await check()).toBe(true);
  });

  it('returns false when access throws', async () => {
    const accessFn = mock(() => Promise.reject(new Error('ENOENT: no such file or directory')));
    const check = createWorkspaceExistsCheck('/missing/workspace', accessFn);
    expect(await check()).toBe(false);
  });
});
