import { describe, it, expect } from 'vitest';

import * as api from './index.js';

describe('public API', () => {
  it('exports loadConfig, defineConfig, and ConfigError', () => {
    expect(typeof api.loadConfig).toBe('function');
    expect(typeof api.defineConfig).toBe('function');
    expect(typeof api.ConfigError).toBe('function');
  });
});
