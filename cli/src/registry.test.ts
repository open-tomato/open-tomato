import type { CliCommand } from '@open-tomato/cli-core';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CommandRegistry, type CommandModule } from './registry.js';

function makeMeta(name: string): CliCommand {
  return {
    name,
    description: `meta for ${name}`,
    args: [],
    flags: [],
    run: async (): Promise<void> => {},
  };
}

function makeModule(meta?: CliCommand): CommandModule {
  return {
    default: () => {},
    meta,
  };
}

describe('CommandRegistry', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tomato-registry-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('discovers known commands from the commands directory', () => {
    fs.mkdirSync(path.join(tmpRoot, 'linear'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'event'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'linear', 'next.ts'), 'export default () => {};');
    fs.writeFileSync(path.join(tmpRoot, 'linear', 'login.ts'), 'export default () => {};');
    fs.writeFileSync(path.join(tmpRoot, 'event', 'send.ts'), 'export default () => {};');

    const registry = new CommandRegistry({ commandsDir: tmpRoot });
    const entries = registry.list();

    const keys = entries.map((e) => `${e.tool} ${e.command}`).sort();
    expect(keys).toEqual(['event send', 'linear login', 'linear next']);
  });

  it('skips .test.ts and .d.ts files during discovery', () => {
    fs.mkdirSync(path.join(tmpRoot, 'linear'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'linear', 'next.ts'), 'export default () => {};');
    fs.writeFileSync(path.join(tmpRoot, 'linear', 'next.test.ts'), '');
    fs.writeFileSync(path.join(tmpRoot, 'linear', 'next.d.ts'), '');

    const registry = new CommandRegistry({ commandsDir: tmpRoot });
    const keys = registry.list().map((e) => `${e.tool} ${e.command}`);

    expect(keys).toEqual(['linear next']);
  });

  it('returns null from get() for an unknown tool', () => {
    const registry = new CommandRegistry({ commandsDir: null });
    registry.register('linear', 'next', makeModule());

    expect(registry.get('unknown', 'next')).toBeNull();
  });

  it('returns null from get() for an unknown command under a known tool', () => {
    const registry = new CommandRegistry({ commandsDir: null });
    registry.register('linear', 'next', makeModule());

    expect(registry.get('linear', 'tasks')).toBeNull();
  });

  it('returns the registered module from get() for a known command', () => {
    const registry = new CommandRegistry({ commandsDir: null });
    const mod = makeModule(makeMeta('next'));
    registry.register('linear', 'next', mod);

    expect(registry.get('linear', 'next')).toBe(mod);
  });

  it('list() includes metadata when the module exports meta', () => {
    const registry = new CommandRegistry({ commandsDir: null });
    const meta = makeMeta('next');
    registry.register('linear', 'next', makeModule(meta));

    const entries = registry.list();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ tool: 'linear', command: 'next', meta });
  });

  it('list() falls back to inferred name (meta: undefined) for discovered modules without meta', () => {
    fs.mkdirSync(path.join(tmpRoot, 'linear'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'linear', 'next.ts'), 'export default () => {};');

    const registry = new CommandRegistry({ commandsDir: tmpRoot });
    const entries = registry.list();

    expect(entries).toEqual([
      { tool: 'linear', command: 'next', meta: undefined },
    ]);
  });

  it('list() falls back to inferred name when a manually registered module omits meta', () => {
    const registry = new CommandRegistry({ commandsDir: null });
    registry.register('linear', 'next', makeModule());

    expect(registry.list()).toEqual([
      { tool: 'linear', command: 'next', meta: undefined },
    ]);
  });

  it('list() prefers registered metadata over filesystem discovery for the same command', () => {
    fs.mkdirSync(path.join(tmpRoot, 'linear'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'linear', 'next.ts'), 'export default () => {};');

    const registry = new CommandRegistry({ commandsDir: tmpRoot });
    const meta = makeMeta('next');
    registry.register('linear', 'next', makeModule(meta));

    const entries = registry.list();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ tool: 'linear', command: 'next', meta });
  });

  it('does not throw when the commands directory does not exist', () => {
    const missing = path.join(tmpRoot, 'does-not-exist');

    expect(() => new CommandRegistry({ commandsDir: missing })).not.toThrow();

    const registry = new CommandRegistry({ commandsDir: missing });
    expect(registry.list()).toEqual([]);
    expect(registry.get('linear', 'next')).toBeNull();
  });

  it('does not throw when filesystem discovery is disabled with commandsDir: null', () => {
    expect(() => new CommandRegistry({ commandsDir: null })).not.toThrow();
    const registry = new CommandRegistry({ commandsDir: null });
    expect(registry.list()).toEqual([]);
  });

  it('does not throw when the commands directory exists but no <tool>/ subdirectories are present', () => {
    fs.writeFileSync(path.join(tmpRoot, 'README.md'), '# stray top-level file');

    expect(() => new CommandRegistry({ commandsDir: tmpRoot })).not.toThrow();

    const registry = new CommandRegistry({ commandsDir: tmpRoot });
    expect(registry.list()).toEqual([]);
    expect(registry.get('linear', 'next')).toBeNull();
  });
});
