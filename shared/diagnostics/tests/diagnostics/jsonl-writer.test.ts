import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';

import { JsonlWriter } from '../../src/diagnostics/jsonl-writer.js';

describe('JsonlWriter', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'jsonl-writer-test-'));
    filePath = join(tmpDir, 'test.jsonl');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes a single record as a valid JSON line', async () => {
    const writer = new JsonlWriter(filePath);
    await writer.append({ event: 'Test', value: 42 });

    const content = await readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]);
    expect(parsed.event).toBe('Test');
    expect(parsed.value).toBe(42);
  });

  it('injects a ts field into every record', async () => {
    const before = new Date().toISOString();
    const writer = new JsonlWriter(filePath);
    await writer.append({ event: 'TsCheck' });
    const after = new Date().toISOString();

    const content = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(content.trim());

    expect(typeof parsed.ts).toBe('string');
    expect(parsed.ts >= before).toBe(true);
    expect(parsed.ts <= after).toBe(true);
  });

  it('overwrites any caller-supplied ts field with the current timestamp', async () => {
    const writer = new JsonlWriter(filePath);
    await writer.append({ event: 'TsOverwrite', ts: 'caller-supplied' });

    const content = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(content.trim());

    expect(parsed.ts).not.toBe('caller-supplied');
    // Should be a valid ISO timestamp
    expect(() => new Date(parsed.ts).toISOString()).not.toThrow();
  });

  it('multiple appends produce valid individual JSONL lines', async () => {
    const writer = new JsonlWriter(filePath);
    await writer.append({ event: 'First', seq: 1 });
    await writer.append({ event: 'Second', seq: 2 });
    await writer.append({ event: 'Third', seq: 3 });

    const content = await readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(3);

    const records = lines.map(l => JSON.parse(l));
    expect(records[0].event).toBe('First');
    expect(records[1].event).toBe('Second');
    expect(records[2].event).toBe('Third');
    expect(records[0].seq).toBe(1);
    expect(records[1].seq).toBe(2);
    expect(records[2].seq).toBe(3);
  });

  it('each line ends with a newline character', async () => {
    const writer = new JsonlWriter(filePath);
    await writer.append({ event: 'NewlineCheck' });

    const content = await readFile(filePath, 'utf8');
    expect(content.endsWith('\n')).toBe(true);
  });

  it('close() resolves without error', async () => {
    const writer = new JsonlWriter(filePath);
    await expect(writer.close()).resolves.toBeUndefined();
  });

  it('close() can be called multiple times without error', async () => {
    const writer = new JsonlWriter(filePath);
    await expect(writer.close()).resolves.toBeUndefined();
    await expect(writer.close()).resolves.toBeUndefined();
  });
});
