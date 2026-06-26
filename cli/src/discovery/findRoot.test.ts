import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findOpenTomatoRoot } from './findRoot.js';

describe('findOpenTomatoRoot', () => {
  let tmpRoot: string;
  let realTmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tomato-findroot-'));
    // On macOS, /tmp is a symlink to /private/tmp; resolve once so child
    // paths compare equal to whatever findOpenTomatoRoot returns.
    realTmpRoot = fs.realpathSync(tmpRoot);
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('returns the start directory when the marker lives there', () => {
    fs.writeFileSync(path.join(realTmpRoot, '.open-tomato-root'), '');

    expect(findOpenTomatoRoot(realTmpRoot)).toBe(realTmpRoot);
  });

  it('walks up three levels to find the marker', () => {
    const deep = path.join(realTmpRoot, 'a', 'b', 'c');
    fs.mkdirSync(deep, { recursive: true });
    fs.writeFileSync(path.join(realTmpRoot, '.open-tomato-root'), '');

    expect(findOpenTomatoRoot(deep)).toBe(realTmpRoot);
  });

  it('returns null when no marker exists between start and filesystem root', () => {
    const deep = path.join(realTmpRoot, 'no', 'marker', 'here');
    fs.mkdirSync(deep, { recursive: true });

    expect(findOpenTomatoRoot(deep)).toBeNull();
  });

  it('follows the resolved path through symlinked directories', () => {
    const realDir = path.join(realTmpRoot, 'real');
    const linkDir = path.join(realTmpRoot, 'link');
    fs.mkdirSync(realDir, { recursive: true });
    fs.writeFileSync(path.join(realDir, '.open-tomato-root'), '');
    fs.symlinkSync(realDir, linkDir, 'dir');

    expect(findOpenTomatoRoot(linkDir)).toBe(linkDir);
  });

  it('returns null for "/" without throwing', () => {
    expect(() => findOpenTomatoRoot('/')).not.toThrow();
    expect(findOpenTomatoRoot('/')).toBeNull();
  });
});
