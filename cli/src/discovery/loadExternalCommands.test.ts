import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearExternalCommandsCache,
  loadExternalCommands,
  type ExternalCommandImporter,
} from './loadExternalCommands.js';
import { loadManifest } from './loadManifest.js';

/**
 * Vitest's Node SSR runtime cannot resolve absolute OS-tmpdir paths through
 * `import()` — its vm context lacks a dynamic-import linker. For tests we
 * inject a synthetic importer that reads the file on disk and returns a
 * stand-in module shaped like an ES module namespace.
 *
 * Each test file uses three sentinel directives (declared as line comments
 * so they survive the simple text scan below):
 *   // ot-throws
 *   // ot-meta: <json>
 *   // ot-default: <function-body>
 *
 * A more elaborate fixture would compile and import for real, but since the
 * production path delegates the actual import to a single injected function,
 * the contract under test is "given an import result, classify and store it"
 * — exactly what this synthetic importer exercises.
 */
function makeFsImporter(): ExternalCommandImporter {
  return async (specifier: string): Promise<unknown> => {
    const filePath = fileURLToPath(specifier);
    const src = fs.readFileSync(filePath, 'utf8');

    if (/\bot-throws\b/.test(src)) {
      throw new Error('boom on import');
    }

    let meta: unknown;
    const metaMatch = src.match(/ot-meta:\s*(\{.*\})/);
    if (metaMatch) meta = JSON.parse(metaMatch[1]!);

    let defaultExport: ((...a: unknown[]) => unknown) | null = null;
    const defaultMatch = src.match(/ot-default:\s*(.*)$/m);
    if (defaultMatch) {
      const body = defaultMatch[1]!.trim();
      defaultExport = () => body;
    }

    const mod: Record<string, unknown> = {};
    if (defaultExport) mod.default = defaultExport;
    if (meta !== undefined) mod.meta = meta;
    return mod;
  };
}

describe('loadExternalCommands', () => {
  let tmpRoot: string;
  let realTmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tomato-loadext-'));
    // macOS tmpdir is symlinked; resolve once so the cache key (an absolute
    // path) matches whatever a downstream caller would derive.
    realTmpRoot = fs.realpathSync(tmpRoot);
    clearExternalCommandsCache();
  });

  afterEach(() => {
    clearExternalCommandsCache();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function writeFixture(relPath: string, contents: string): string {
    const abs = path.join(realTmpRoot, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contents);
    return abs;
  }

  it('loads every module when all imports succeed', async () => {
    const aPath = writeFixture(
      'a.mjs',
      '// ot-meta: {"name":"a"}\n// ot-default: a-ran\n',
    );
    const bPath = writeFixture(
      'b.mjs',
      '// ot-default: b-ran\n',
    );

    const result = await loadExternalCommands(
      {
        commands: [
          { tool: 'svc', command: 'a', module: aPath },
          { tool: 'svc', command: 'b', module: bPath },
        ],
      },
      realTmpRoot,
      makeFsImporter(),
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.tool).toBe('svc');
    expect(result[0]?.command).toBe('a');
    expect(result[0]?.module.meta).toEqual({ name: 'a' });
    expect(result[0]?.module.default()).toBe('a-ran');
    expect(result[1]?.command).toBe('b');
    expect(result[1]?.module.meta).toBeUndefined();
    expect(result[1]?.module.default()).toBe('b-ran');
  });

  it('skips a module that throws on import but keeps the rest', async () => {
    const badPath = writeFixture('bad.mjs', '// ot-throws\n');
    const goodPath = writeFixture(
      'good.mjs',
      '// ot-default: good-ran\n',
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await loadExternalCommands(
        {
          commands: [
            { tool: 'svc', command: 'bad', module: badPath },
            { tool: 'svc', command: 'good', module: goodPath },
          ],
        },
        realTmpRoot,
        makeFsImporter(),
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.command).toBe('good');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain(badPath);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('skips a module with no callable default export but keeps the rest', async () => {
    const noDefaultPath = writeFixture(
      'no-default.mjs',
      '// ot-meta: {"name":"x"}\n',
    );
    const goodPath = writeFixture(
      'good.mjs',
      '// ot-default: good-ran\n',
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await loadExternalCommands(
        {
          commands: [
            { tool: 'svc', command: 'broken', module: noDefaultPath },
            { tool: 'svc', command: 'good', module: goodPath },
          ],
        },
        realTmpRoot,
        makeFsImporter(),
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.command).toBe('good');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain(noDefaultPath);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('accepts a CliCommand object exported as default (treats .run as entrypoint)', async () => {
    const ran: unknown[] = [];
    const cmd = {
      name: 'validate',
      description: 'validate a service',
      args: [],
      flags: [],
      run: async (ctx: unknown): Promise<void> => {
        ran.push(ctx);
      },
    };
    const importer: ExternalCommandImporter = async () => ({ default: cmd });

    const result = await loadExternalCommands(
      { commands: [{ tool: 'svc', command: 'validate', module: '/x/v.mjs' }] },
      realTmpRoot,
      importer,
    );

    expect(result).toHaveLength(1);
    // The CliCommand object becomes the command's meta.
    expect(result[0]?.module.meta).toBe(cmd);
    // Calling default(ctx) routes through cmd.run(ctx).
    const fakeCtx = { sentinel: true };
    await result[0]?.module.default(fakeCtx);
    expect(ran).toEqual([fakeCtx]);
  });

  it('accepts a CliCommand object as the module namespace itself (no default)', async () => {
    const ran: unknown[] = [];
    const cmd = {
      name: 'setup',
      description: 'set up',
      args: [],
      flags: [],
      run: async (ctx: unknown): Promise<void> => {
        ran.push(ctx);
      },
    };
    // Module namespace exposes run/meta directly with no `default`.
    const importer: ExternalCommandImporter = async () => cmd;

    const result = await loadExternalCommands(
      { commands: [{ tool: 'setup', command: 'setup', module: '/x/s.mjs' }] },
      realTmpRoot,
      importer,
    );

    expect(result).toHaveLength(1);
    expect(typeof result[0]?.module.default).toBe('function');
    const fakeCtx = { sentinel: 2 };
    await result[0]?.module.default(fakeCtx);
    expect(ran).toEqual([fakeCtx]);
  });

  it('returns the same array reference on a second call with the same rootDir', async () => {
    const aPath = writeFixture('a.mjs', '// ot-default: a-ran\n');

    const manifest = {
      commands: [{ tool: 'svc', command: 'a', module: aPath }],
    };

    const first = await loadExternalCommands(
      manifest,
      realTmpRoot,
      makeFsImporter(),
    );
    const second = await loadExternalCommands(
      manifest,
      realTmpRoot,
      makeFsImporter(),
    );

    expect(second).toBe(first);
  });

  it('integrates with a real .open-tomato-root + manifest + module files', async () => {
    fs.writeFileSync(path.join(realTmpRoot, '.open-tomato-root'), '');
    const validatePath = writeFixture(
      'tools/commands/svc/validate.mjs',
      '// ot-meta: {"name":"validate"}\n// ot-default: validate-ran\n',
    );
    const generatePath = writeFixture(
      'tools/commands/svc/generate.mjs',
      '// ot-default: generate-ran\n',
    );

    fs.writeFileSync(
      path.join(realTmpRoot, 'package.json'),
      JSON.stringify({
        name: 'grow-box-tools',
        ot: {
          commands: [
            {
              tool: 'svc',
              command: 'validate',
              module: './tools/commands/svc/validate.mjs',
            },
            {
              tool: 'svc',
              command: 'generate',
              module: './tools/commands/svc/generate.mjs',
            },
          ],
        },
      }),
    );

    const manifest = loadManifest(realTmpRoot);
    expect(manifest).not.toBeNull();
    expect(manifest?.commands[0]?.module).toBe(validatePath);
    expect(manifest?.commands[1]?.module).toBe(generatePath);

    const result = await loadExternalCommands(
      manifest!,
      realTmpRoot,
      makeFsImporter(),
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.tool).toBe('svc');
    expect(result[0]?.command).toBe('validate');
    expect(result[0]?.module.meta).toEqual({ name: 'validate' });
    expect(result[0]?.module.default()).toBe('validate-ran');
    expect(result[1]?.command).toBe('generate');
    expect(result[1]?.module.default()).toBe('generate-ran');
  });
});
