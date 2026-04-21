import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildPrompt, countTasks, findNextTask, updateTrackerLine } from './plan.js';

// ---------------------------------------------------------------------------
// findNextTask
// ---------------------------------------------------------------------------

describe('findNextTask', () => {
  it('returns null for empty content', () => {
    expect(findNextTask('')).toBeNull();
  });

  it('returns null when all tasks are checked', () => {
    const content = '- [x] Done task\n- [X] Another done\n';
    expect(findNextTask(content)).toBeNull();
  });

  it('finds the first unchecked task', () => {
    const content = '- [x] Done\n- [ ] First open\n- [ ] Second open\n';
    const result = findNextTask(content);
    expect(result).not.toBeNull();
    expect(result!.task).toBe('First open');
    expect(result!.lineNum).toBe(1);
    expect(result!.status).toBe('unchecked');
  });

  it('prefers a blocked task over unchecked tasks', () => {
    const content = '- [ ] Unchecked\n- [BLOCKED] Was blocked\n- [ ] Another\n';
    const result = findNextTask(content);
    expect(result!.task).toBe('Was blocked');
    expect(result!.lineNum).toBe(1);
    expect(result!.status).toBe('blocked');
  });

  it('returns the first blocked task when multiple are present', () => {
    const content = '- [BLOCKED] First blocked\n- [BLOCKED] Second blocked\n';
    const result = findNextTask(content);
    expect(result!.task).toBe('First blocked');
    expect(result!.lineNum).toBe(0);
  });

  it('strips task text correctly', () => {
    const content = '- [ ]   Implement the auth module  \n';
    const result = findNextTask(content);
    expect(result!.task).toBe('Implement the auth module');
  });
});

// ---------------------------------------------------------------------------
// countTasks
// ---------------------------------------------------------------------------

describe('countTasks', () => {
  it('returns 0 for empty content', () => {
    expect(countTasks('')).toBe(0);
  });

  it('counts unchecked tasks', () => {
    const content = '- [ ] Task one\n- [ ] Task two\n';
    expect(countTasks(content)).toBe(2);
  });

  it('counts checked tasks', () => {
    const content = '- [x] Done one\n- [X] Done two\n';
    expect(countTasks(content)).toBe(2);
  });

  it('counts blocked tasks', () => {
    const content = '- [BLOCKED] Stuck\n';
    expect(countTasks(content)).toBe(1);
  });

  it('counts a mix of all statuses', () => {
    const content = '- [ ] Open\n- [x] Done\n- [BLOCKED] Stuck\n# Heading\nsome text\n';
    expect(countTasks(content)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// updateTrackerLine
// ---------------------------------------------------------------------------

describe('updateTrackerLine', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `tracker-${Date.now()}.md`);
  });

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  it('marks an unchecked task as done', () => {
    fs.writeFileSync(tmpFile, '- [ ] My task\n- [ ] Other task\n', 'utf8');
    updateTrackerLine(tmpFile, 0, 'done');
    const result = fs.readFileSync(tmpFile, 'utf8');
    expect(result).toBe('- [x] My task\n- [ ] Other task\n');
  });

  it('marks an unchecked task as blocked', () => {
    fs.writeFileSync(tmpFile, '- [ ] My task\n', 'utf8');
    updateTrackerLine(tmpFile, 0, 'blocked');
    const result = fs.readFileSync(tmpFile, 'utf8');
    expect(result).toBe('- [BLOCKED] My task\n');
  });

  it('marks a blocked task as done', () => {
    fs.writeFileSync(tmpFile, '- [BLOCKED] Stuck task\n', 'utf8');
    updateTrackerLine(tmpFile, 0, 'done');
    const result = fs.readFileSync(tmpFile, 'utf8');
    expect(result).toBe('- [x] Stuck task\n');
  });

  it('only modifies the targeted line', () => {
    fs.writeFileSync(tmpFile, '- [x] Done\n- [ ] Target\n- [ ] Untouched\n', 'utf8');
    updateTrackerLine(tmpFile, 1, 'done');
    const lines = fs.readFileSync(tmpFile, 'utf8').split('\n');
    expect(lines[0]).toBe('- [x] Done');
    expect(lines[1]).toBe('- [x] Target');
    expect(lines[2]).toBe('- [ ] Untouched');
  });

  it('is a no-op for an out-of-range line number', () => {
    const original = '- [ ] Task\n';
    fs.writeFileSync(tmpFile, original, 'utf8');
    updateTrackerLine(tmpFile, 99, 'done');
    expect(fs.readFileSync(tmpFile, 'utf8')).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// buildPrompt
// ---------------------------------------------------------------------------

describe('buildPrompt', () => {
  it('includes the task text, prompt content, and plan content', () => {
    const result = buildPrompt('Write tests', 'PROMPT content', 'PLAN content');
    expect(result).toContain('Write tests');
    expect(result).toContain('PROMPT content');
    expect(result).toContain('PLAN content');
  });

  it('starts with the scoped task instruction', () => {
    const result = buildPrompt('My task', '', '');
    expect(result.startsWith('Your current scoped task is: My task')).toBe(true);
  });
});
