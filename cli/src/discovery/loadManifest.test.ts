import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadManifest } from './loadManifest.js';

describe('loadManifest', () => {
  let tmpRoot: string;
  let realTmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tomato-loadmanifest-'));
    // macOS tmpdir is symlinked; resolve once so absolute path comparisons
    // hold on both macOS and Linux.
    realTmpRoot = fs.realpathSync(tmpRoot);
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function writePackageJson(content: unknown): void {
    fs.writeFileSync(
      path.join(realTmpRoot, 'package.json'),
      JSON.stringify(content),
    );
  }

  it('returns commands with module paths resolved against rootDir', () => {
    writePackageJson({
      name: 'grow-box-tools',
      ot: {
        commands: [
          {
            tool: 'svc',
            command: 'validate',
            module: './tools/commands/svc/validate.ts',
          },
          {
            tool: 'svc',
            command: 'generate',
            module: './tools/commands/svc/generate.ts',
          },
        ],
      },
    });

    const result = loadManifest(realTmpRoot);

    expect(result).not.toBeNull();
    expect(result?.commands).toEqual([
      {
        tool: 'svc',
        command: 'validate',
        module: path.join(realTmpRoot, 'tools/commands/svc/validate.ts'),
      },
      {
        tool: 'svc',
        command: 'generate',
        module: path.join(realTmpRoot, 'tools/commands/svc/generate.ts'),
      },
    ]);
  });

  it('returns null when package.json is missing', () => {
    expect(loadManifest(realTmpRoot)).toBeNull();
  });

  it('returns null when ot.commands is absent', () => {
    writePackageJson({ name: 'grow-box-tools' });
    expect(loadManifest(realTmpRoot)).toBeNull();
  });

  it('returns null with a warning when ot.commands is not an array', () => {
    writePackageJson({
      name: 'grow-box-tools',
      ot: { commands: 'not-an-array' },
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(loadManifest(realTmpRoot)).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('returns null with a warning when ot is malformed (not an object)', () => {
    writePackageJson({ name: 'grow-box-tools', ot: 'nope' });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(loadManifest(realTmpRoot)).toBeNull();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('skips entries with missing required fields and keeps valid ones', () => {
    writePackageJson({
      name: 'grow-box-tools',
      ot: {
        commands: [
          { tool: 'svc', command: 'validate', module: './a.ts' },
          { tool: 'svc', command: 'generate' }, // missing module
          { command: 'reconcile', module: './c.ts' }, // missing tool
          { tool: 'svc', module: './d.ts' }, // missing command
          { tool: 'svc', command: 'list', module: './e.ts' },
        ],
      },
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = loadManifest(realTmpRoot);
      expect(result).not.toBeNull();
      expect(result?.commands).toEqual([
        {
          tool: 'svc',
          command: 'validate',
          module: path.join(realTmpRoot, 'a.ts'),
        },
        {
          tool: 'svc',
          command: 'list',
          module: path.join(realTmpRoot, 'e.ts'),
        },
      ]);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('returns null with a warning when package.json is not valid JSON', () => {
    fs.writeFileSync(path.join(realTmpRoot, 'package.json'), '{ not json');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(loadManifest(realTmpRoot)).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
