import type { PromptContext, SkillManifest } from '../types/index.js';

import { describe, expect, it } from 'vitest';

import { AutoInjectedSkillsSection } from './auto-injected-skills.js';

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

function makeContext(skills: SkillManifest[]): Pick<PromptContext, 'skills'> & Partial<PromptContext> {
  return { skills } as PromptContext;
}

// ─── AutoInjectedSkillsSection ────────────────────────────────────────────────

describe('AutoInjectedSkillsSection', () => {
  const section = new AutoInjectedSkillsSection();

  it('has the correct section name', () => {
    expect(section.name).toBe('auto-injected-skills');
  });

  it('returns an empty string when skills array is empty', () => {
    const context = makeContext([]);
    expect(section.render(context as PromptContext)).toBe('');
  });

  it('wraps a single skill in its XML tag', () => {
    const skill = makeSkill({ xmlTag: 'memory-data', docs: 'Memory docs here.' });
    const context = makeContext([skill]);
    const result = section.render(context as PromptContext);

    expect(result).toBe('<memory-data>\nMemory docs here.\n</memory-data>');
  });

  it('renders multiple skills separated by a blank line', () => {
    const skill1 = makeSkill({ id: 'skill-1', xmlTag: 'memory-data', docs: 'Memory docs.' });
    const skill2 = makeSkill({ id: 'skill-2', xmlTag: 'tool-docs', docs: 'Tool documentation.' });
    const context = makeContext([skill1, skill2]);
    const result = section.render(context as PromptContext);

    expect(result).toBe(
      '<memory-data>\nMemory docs.\n</memory-data>\n\n<tool-docs>\nTool documentation.\n</tool-docs>',
    );
  });

  it('preserves multi-line docs inside the XML tags', () => {
    const multiLineDocs = 'Line one.\nLine two.\nLine three.';
    const skill = makeSkill({ xmlTag: 'robot-interaction', docs: multiLineDocs });
    const context = makeContext([skill]);
    const result = section.render(context as PromptContext);

    expect(result).toBe(`<robot-interaction>\n${multiLineDocs}\n</robot-interaction>`);
  });

  it('uses each skill\'s own xmlTag as the wrapping element', () => {
    const skills = [
      makeSkill({ id: 'a', xmlTag: 'memory-data', docs: 'mem' }),
      makeSkill({ id: 'b', xmlTag: 'tool-docs', docs: 'tools' }),
      makeSkill({ id: 'c', xmlTag: 'robot-interaction', docs: 'robot' }),
      makeSkill({ id: 'd', xmlTag: 'custom-skill', docs: 'custom' }),
    ];
    const context = makeContext(skills);
    const result = section.render(context as PromptContext);

    expect(result).toContain('<memory-data>');
    expect(result).toContain('</memory-data>');
    expect(result).toContain('<tool-docs>');
    expect(result).toContain('</tool-docs>');
    expect(result).toContain('<robot-interaction>');
    expect(result).toContain('</robot-interaction>');
    expect(result).toContain('<custom-skill>');
    expect(result).toContain('</custom-skill>');
  });

  it('renders skills in the same order they appear in the context', () => {
    const skills = [
      makeSkill({ id: 'first', xmlTag: 'first-tag', docs: 'first' }),
      makeSkill({ id: 'second', xmlTag: 'second-tag', docs: 'second' }),
      makeSkill({ id: 'third', xmlTag: 'third-tag', docs: 'third' }),
    ];
    const context = makeContext(skills);
    const result = section.render(context as PromptContext);

    const firstPos = result.indexOf('<first-tag>');
    const secondPos = result.indexOf('<second-tag>');
    const thirdPos = result.indexOf('<third-tag>');

    expect(firstPos).toBeLessThan(secondPos);
    expect(secondPos).toBeLessThan(thirdPos);
  });

  it('includes docs content inside the XML tags', () => {
    const docs = 'Detailed documentation for the skill.';
    const skill = makeSkill({ xmlTag: 'my-skill', docs });
    const context = makeContext([skill]);
    const result = section.render(context as PromptContext);

    expect(result).toContain(docs);
  });
});
