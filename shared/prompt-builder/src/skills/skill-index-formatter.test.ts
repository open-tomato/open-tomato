import type { SkillManifest } from '@open-tomato/types';

import { describe, expect, it } from 'vitest';

import { SkillIndexFormatter } from './skill-index-formatter.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSkill(overrides?: Partial<SkillManifest>): SkillManifest {
  return {
    id: 'test-skill',
    name: 'Test Skill',
    description: 'A test skill.',
    xmlTag: 'test-skill',
    docs: 'Test documentation.',
    ...overrides,
  };
}

// ─── SkillIndexFormatter ──────────────────────────────────────────────────────

describe('SkillIndexFormatter', () => {
  const formatter = new SkillIndexFormatter();

  describe('formatRow', () => {
    it('renders id, name, and description as a Markdown table row', () => {
      const skill = makeSkill({ id: 'memory-data', name: 'Memory Data', description: 'Injects memory blocks.' });
      expect(formatter.formatRow(skill)).toBe('| memory-data | Memory Data | Injects memory blocks. |');
    });

    it('truncates a multi-line description to the first line only', () => {
      const skill = makeSkill({
        id: 'my-skill',
        name: 'My Skill',
        description: 'First line.\nSecond line.\nThird line.',
      });
      expect(formatter.formatRow(skill)).toBe('| my-skill | My Skill | First line. |');
    });

    it('uses the full description when it is a single line', () => {
      const skill = makeSkill({ description: 'Single line description.' });
      expect(formatter.formatRow(skill)).toContain('Single line description.');
    });
  });

  describe('format', () => {
    it('returns an empty string for an empty skill list', () => {
      expect(formatter.format([])).toBe('');
    });

    it('includes the table header row', () => {
      const result = formatter.format([makeSkill()]);
      expect(result).toContain('| ID | Name | Description |');
    });

    it('includes the table divider row', () => {
      const result = formatter.format([makeSkill()]);
      expect(result).toContain('| --- | --- | --- |');
    });

    it('includes a data row for each skill', () => {
      const skills = [
        makeSkill({ id: 'skill-a', name: 'Skill A', description: 'Desc A.' }),
        makeSkill({ id: 'skill-b', name: 'Skill B', description: 'Desc B.' }),
      ];
      const result = formatter.format(skills);
      expect(result).toContain('| skill-a | Skill A | Desc A. |');
      expect(result).toContain('| skill-b | Skill B | Desc B. |');
    });

    it('renders header before divider before rows', () => {
      const skill = makeSkill({ id: 'my-skill', name: 'My Skill', description: 'Desc.' });
      const result = formatter.format([skill]);
      const lines = result.split('\n');
      expect(lines[0]).toBe('| ID | Name | Description |');
      expect(lines[1]).toBe('| --- | --- | --- |');
      expect(lines[2]).toBe('| my-skill | My Skill | Desc. |');
    });

    it('truncates long descriptions to first line in the table', () => {
      const skill = makeSkill({
        id: 'long-skill',
        name: 'Long Skill',
        description: 'Short first line.\nVery long second line with extra detail.',
      });
      const result = formatter.format([skill]);
      expect(result).toContain('Short first line.');
      expect(result).not.toContain('Very long second line');
    });

    it('renders skills in the order they are provided', () => {
      const skills = [
        makeSkill({ id: 'first' }),
        makeSkill({ id: 'second' }),
        makeSkill({ id: 'third' }),
      ];
      const result = formatter.format(skills);
      const firstPos = result.indexOf('first');
      const secondPos = result.indexOf('second');
      const thirdPos = result.indexOf('third');
      expect(firstPos).toBeLessThan(secondPos);
      expect(secondPos).toBeLessThan(thirdPos);
    });
  });
});
