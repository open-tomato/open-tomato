import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';

import { PromptLogWriter } from '../../src/diagnostics/prompt-log-writer.js';

describe('PromptLogWriter', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'prompt-log-writer-test-'));
    filePath = join(tmpDir, 'prompt-log.md');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes a markdown section header with hat and iterationId', async () => {
    const writer = new PromptLogWriter(filePath);
    await writer.append('planner', 'iter-001', 'What is the plan?');

    const content = await readFile(filePath, 'utf8');
    expect(content).toContain('## [');
    expect(content).toContain('] Hat: planner | Iteration: iter-001');
  });

  it('header contains a valid ISO timestamp', async () => {
    const before = new Date().toISOString();
    const writer = new PromptLogWriter(filePath);
    await writer.append('executor', 'iter-002', 'Execute this.');
    const after = new Date().toISOString();

    const content = await readFile(filePath, 'utf8');
    const match = content.match(/## \[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const ts = match![1];
    expect(ts >= before).toBe(true);
    expect(ts <= after).toBe(true);
  });

  it('writes the full prompt text after the header', async () => {
    const prompt = 'This is the full prompt text.';
    const writer = new PromptLogWriter(filePath);
    await writer.append('reviewer', 'iter-003', prompt);

    const content = await readFile(filePath, 'utf8');
    expect(content).toContain(prompt);
  });

  it('sequential appends each produce their own header and prompt', async () => {
    const writer = new PromptLogWriter(filePath);
    await writer.append('hat-a', 'iter-1', 'First prompt');
    await writer.append('hat-b', 'iter-2', 'Second prompt');

    const content = await readFile(filePath, 'utf8');
    expect(content).toContain('Hat: hat-a | Iteration: iter-1');
    expect(content).toContain('First prompt');
    expect(content).toContain('Hat: hat-b | Iteration: iter-2');
    expect(content).toContain('Second prompt');
  });

  it('second append does not overwrite the first', async () => {
    const writer = new PromptLogWriter(filePath);
    await writer.append('hat-a', 'iter-1', 'First prompt');
    await writer.append('hat-b', 'iter-2', 'Second prompt');

    const content = await readFile(filePath, 'utf8');
    const firstIdx = content.indexOf('First prompt');
    const secondIdx = content.indexOf('Second prompt');
    expect(firstIdx).toBeGreaterThanOrEqual(0);
    expect(secondIdx).toBeGreaterThan(firstIdx);
  });

  it('handles special characters in prompt text', async () => {
    const prompt = 'Prompt with <tags>, "quotes", \\backslash, and\nnewlines.';
    const writer = new PromptLogWriter(filePath);
    await writer.append('hat-x', 'iter-special', prompt);

    const content = await readFile(filePath, 'utf8');
    expect(content).toContain(prompt);
  });

  it('handles special characters in hat and iterationId', async () => {
    const writer = new PromptLogWriter(filePath);
    await writer.append('hat/with-dashes', 'iter_underscore.dot', 'Some prompt');

    const content = await readFile(filePath, 'utf8');
    expect(content).toContain('Hat: hat/with-dashes | Iteration: iter_underscore.dot');
  });

  it('output ends with a newline', async () => {
    const writer = new PromptLogWriter(filePath);
    await writer.append('hat', 'iter', 'prompt text');

    const content = await readFile(filePath, 'utf8');
    expect(content.endsWith('\n')).toBe(true);
  });
});
