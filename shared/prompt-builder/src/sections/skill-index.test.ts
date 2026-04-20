import type { PromptContext, SkillManifest } from '../types/index.js';

import { describe, expect, it } from 'vitest';

import { SkillIndexSection } from './skill-index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSkill(overrides?: Partial<SkillManifest>): SkillManifest {
  return {
    id: 'test-skill',
    name: 'Test Skill',
    description: 'A test skill for unit testing.',
    xmlTag: 'test-skill',
    docs: 'Test skill documentation content.',
    ...overrides,
  };
}

function makeContext(skills: SkillManifest[]): PromptContext {
  return { skills } as PromptContext;
}

// ─── SkillIndexSection ────────────────────────────────────────────────────────

describe('SkillIndexSection', () => {
  const section = new SkillIndexSection();

  it('has the correct section name', () => {
    expect(section.name).toBe('skill-index');
  });

  it('returns an empty string when skills array is empty', () => {
    const context = makeContext([]);
    expect(section.render(context)).toBe('');
  });

  it('renders the section header', () => {
    const context = makeContext([makeSkill()]);
    expect(section.render(context)).toContain('## SKILL INDEX');
  });

  it('renders table header and divider rows', () => {
    const context = makeContext([makeSkill()]);
    const result = section.render(context);

    expect(result).toContain('| ID | Name | Description |');
    expect(result).toContain('| --- | --- | --- |');
  });

  it('renders a single skill as a table row', () => {
    const skill = makeSkill({ id: 'my-skill', name: 'My Skill', description: 'Does something useful.' });
    const context = makeContext([skill]);
    const result = section.render(context);

    expect(result).toContain('| my-skill | My Skill | Does something useful. |');
  });

  it('renders multiple skills as separate table rows', () => {
    const skills = [
      makeSkill({ id: 'skill-a', name: 'Skill A', description: 'First skill.' }),
      makeSkill({ id: 'skill-b', name: 'Skill B', description: 'Second skill.' }),
    ];
    const context = makeContext(skills);
    const result = section.render(context);

    expect(result).toContain('| skill-a | Skill A | First skill. |');
    expect(result).toContain('| skill-b | Skill B | Second skill. |');
  });

  it('renders skills in the same order they appear in the context', () => {
    const skills = [
      makeSkill({ id: 'first', name: 'First' }),
      makeSkill({ id: 'second', name: 'Second' }),
      makeSkill({ id: 'third', name: 'Third' }),
    ];
    const context = makeContext(skills);
    const result = section.render(context);

    const firstPos = result.indexOf('| first |');
    const secondPos = result.indexOf('| second |');
    const thirdPos = result.indexOf('| third |');

    expect(firstPos).toBeLessThan(secondPos);
    expect(secondPos).toBeLessThan(thirdPos);
  });

  it('truncates multi-line descriptions to the first line only', () => {
    const skill = makeSkill({ id: 'ml-skill', description: 'First line.\nSecond line.\nThird line.' });
    const context = makeContext([skill]);
    const result = section.render(context);

    expect(result).toContain('First line.');
    expect(result).not.toContain('Second line.');
    expect(result).not.toContain('Third line.');
  });

  it('produces a valid Markdown table structure (header before divider before rows)', () => {
    const context = makeContext([makeSkill({ id: 'x', name: 'X', description: 'X skill.' })]);
    const result = section.render(context);
    const lines = result.split('\n');

    const headerLineIdx = lines.findIndex((l) => l.includes('| ID |'));
    const dividerLineIdx = lines.findIndex((l) => l.includes('| --- |'));
    const rowLineIdx = lines.findIndex((l) => l.includes('| x |'));

    expect(headerLineIdx).toBeGreaterThanOrEqual(0);
    expect(dividerLineIdx).toBe(headerLineIdx + 1);
    expect(rowLineIdx).toBeGreaterThan(dividerLineIdx);
  });
});
