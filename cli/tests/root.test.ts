import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveRepoRoot } from '../src/root.js';

describe('resolveRepoRoot', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'open-tomato-cli-root-'));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('returns null when no marker is found', () => {
    const nested = path.join(tempRoot, 'a', 'b');
    fs.mkdirSync(nested, { recursive: true });

    expect(resolveRepoRoot(nested)).toBeNull();
  });

  it('finds .open-tomato-root marker walking upwards', () => {
    const root = path.join(tempRoot, 'repo');
    const nested = path.join(root, 'packages', 'my-pkg', 'src');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(root, '.open-tomato-root'), '');

    expect(resolveRepoRoot(nested)).toBe(root);
  });

  it('finds package.json with workspaces field', () => {
    const root = path.join(tempRoot, 'repo');
    const nested = path.join(root, 'apps', 'web');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'root', workspaces: ['packages/*'] }),
    );

    expect(resolveRepoRoot(nested)).toBe(root);
  });

  it('ignores package.json without workspaces field', () => {
    const nested = path.join(tempRoot, 'pkg');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(
      path.join(nested, 'package.json'),
      JSON.stringify({ name: 'solo' }),
    );

    expect(resolveRepoRoot(nested)).toBeNull();
  });

  it('prefers closer marker over ancestor markers', () => {
    const outer = path.join(tempRoot, 'outer');
    const inner = path.join(outer, 'nested-repo');
    const deep = path.join(inner, 'src');
    fs.mkdirSync(deep, { recursive: true });
    fs.writeFileSync(path.join(outer, '.open-tomato-root'), '');
    fs.writeFileSync(path.join(inner, '.open-tomato-root'), '');

    expect(resolveRepoRoot(deep)).toBe(inner);
  });
});
