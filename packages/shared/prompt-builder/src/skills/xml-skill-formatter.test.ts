import type { SkillManifest } from '@open-tomato/types';

import { describe, expect, it } from 'vitest';

import { XmlSkillFormatter } from './xml-skill-formatter.js';

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

// ─── XmlSkillFormatter ────────────────────────────────────────────────────────

describe('XmlSkillFormatter', () => {
  const formatter = new XmlSkillFormatter();

  describe('format', () => {
    it('wraps a skill in its XML tag', () => {
      const skill = makeSkill({ xmlTag: 'memory-data', docs: 'Memory docs here.' });
      expect(formatter.format(skill)).toBe('<memory-data>\nMemory docs here.\n</memory-data>');
    });

    it('uses the skill xmlTag as the wrapping element name', () => {
      const skill = makeSkill({ xmlTag: 'robot-interaction', docs: 'Robot docs.' });
      const result = formatter.format(skill);
      expect(result).toContain('<robot-interaction>');
      expect(result).toContain('</robot-interaction>');
    });

    it('preserves multi-line docs inside the XML tags', () => {
      const multiLineDocs = 'Line one.\nLine two.\nLine three.';
      const skill = makeSkill({ xmlTag: 'tool-docs', docs: multiLineDocs });
      expect(formatter.format(skill)).toBe(`<tool-docs>\n${multiLineDocs}\n</tool-docs>`);
    });

    it('includes the docs content inside the tags', () => {
      const docs = 'Detailed documentation content.';
      const skill = makeSkill({ xmlTag: 'custom-skill', docs });
      expect(formatter.format(skill)).toContain(docs);
    });
  });

  describe('formatAll', () => {
    it('returns an empty string for an empty skill list', () => {
      expect(formatter.formatAll([])).toBe('');
    });

    it('formats a single skill correctly', () => {
      const skill = makeSkill({ xmlTag: 'memory-data', docs: 'Memory docs.' });
      expect(formatter.formatAll([skill])).toBe('<memory-data>\nMemory docs.\n</memory-data>');
    });

    it('separates multiple skills with a blank line', () => {
      const skills = [
        makeSkill({ id: 'a', xmlTag: 'memory-data', docs: 'Memory docs.' }),
        makeSkill({ id: 'b', xmlTag: 'tool-docs', docs: 'Tool docs.' }),
      ];
      const result = formatter.formatAll(skills);
      expect(result).toBe(
        '<memory-data>\nMemory docs.\n</memory-data>\n\n<tool-docs>\nTool docs.\n</tool-docs>',
      );
    });

    it('renders skills in the order they are provided', () => {
      const skills = [
        makeSkill({ id: 'first', xmlTag: 'first-tag', docs: 'first' }),
        makeSkill({ id: 'second', xmlTag: 'second-tag', docs: 'second' }),
        makeSkill({ id: 'third', xmlTag: 'third-tag', docs: 'third' }),
      ];
      const result = formatter.formatAll(skills);
      const firstPos = result.indexOf('<first-tag>');
      const secondPos = result.indexOf('<second-tag>');
      const thirdPos = result.indexOf('<third-tag>');
      expect(firstPos).toBeLessThan(secondPos);
      expect(secondPos).toBeLessThan(thirdPos);
    });
  });
});
