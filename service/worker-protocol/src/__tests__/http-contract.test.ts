import { describe, expect, it } from 'vitest';

import {
  ExecRequestSchema,
  HealthResponseSchema,
  WorkspaceCleanResponseSchema,
  WorkspaceRequestSchema,
  WorkspaceResponseSchema,
} from '../http-contract.js';

describe('ExecRequestSchema', () => {
  it('accepts valid exec request', () => {
    const result = ExecRequestSchema.safeParse({
      prompt: 'Fix the bug in auth.ts',
      workDir: '/workspace/repo',
    });
    expect(result.success).toBe(true);
  });

  it('accepts exec request with optional model', () => {
    const result = ExecRequestSchema.safeParse({
      prompt: 'Implement feature X',
      workDir: '/workspace/repo',
      model: 'sonnet',
    });
    expect(result.success).toBe(true);
    expect(result.data!.model).toBe('sonnet');
  });

  it('accepts exec request with optional providerUrl', () => {
    const result = ExecRequestSchema.safeParse({
      prompt: 'Run tests',
      workDir: '/workspace/repo',
      model: 'local-qwen-14b',
      providerUrl: 'http://localhost:11434/v1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty prompt', () => {
    const result = ExecRequestSchema.safeParse({
      prompt: '',
      workDir: '/workspace/repo',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing workDir', () => {
    const result = ExecRequestSchema.safeParse({
      prompt: 'Do something',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid providerUrl', () => {
    const result = ExecRequestSchema.safeParse({
      prompt: 'Do something',
      workDir: '/workspace',
      providerUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('WorkspaceRequestSchema', () => {
  it('accepts valid workspace request', () => {
    const result = WorkspaceRequestSchema.safeParse({
      branch: 'feature/OPT-123',
    });
    expect(result.success).toBe(true);
  });

  it('accepts workspace request with repoUrl', () => {
    const result = WorkspaceRequestSchema.safeParse({
      branch: 'main',
      repoUrl: 'https://github.com/org/repo.git',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty branch', () => {
    const result = WorkspaceRequestSchema.safeParse({
      branch: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('WorkspaceResponseSchema', () => {
  it('accepts valid response', () => {
    const result = WorkspaceResponseSchema.safeParse({
      workDir: '/tmp/task-worker-abc123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty workDir', () => {
    const result = WorkspaceResponseSchema.safeParse({
      workDir: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('WorkspaceCleanResponseSchema', () => {
  it('accepts valid clean response', () => {
    const result = WorkspaceCleanResponseSchema.safeParse({
      cleaned: true,
    });
    expect(result.success).toBe(true);
  });
});

describe('HealthResponseSchema', () => {
  it('accepts valid health response', () => {
    const result = HealthResponseSchema.safeParse({
      status: 'idle',
      workerId: 'task-worker-0',
      supportedModels: ['sonnet', 'haiku'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts busy status', () => {
    const result = HealthResponseSchema.safeParse({
      status: 'busy',
      workerId: 'tw-1',
      supportedModels: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = HealthResponseSchema.safeParse({
      status: 'offline',
      workerId: 'tw-1',
      supportedModels: [],
    });
    expect(result.success).toBe(false);
  });
});
