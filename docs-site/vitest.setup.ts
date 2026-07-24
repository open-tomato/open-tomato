import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// React 19 requires this flag for act()-wrapped Testing Library renders.
// (Vitest globals are off in this workspace, so RTL cannot auto-register
// its cleanup — do both explicitly.)
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
});
