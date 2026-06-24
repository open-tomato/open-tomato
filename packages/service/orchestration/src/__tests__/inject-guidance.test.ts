import { describe, expect, it } from 'bun:test';

import { injectGuidance } from '../inject-guidance.js';

describe('injectGuidance', () => {
  it('appends a ROBOT GUIDANCE section at the end of the prompt', () => {
    const prompt = 'Do the thing.';
    const guidance = '1. Be careful\n2. Double-check';

    const result = injectGuidance(prompt, guidance);

    expect(result).toBe(
      'Do the thing.\n\n## ROBOT GUIDANCE\n1. Be careful\n2. Double-check\n',
    );
  });

  it('preserves the original prompt content unchanged', () => {
    const prompt = 'Original prompt text here.';
    const guidance = '1. Note A';

    const result = injectGuidance(prompt, guidance);

    expect(result.startsWith(prompt)).toBe(true);
  });

  it('contains the ## ROBOT GUIDANCE header', () => {
    const result = injectGuidance('prompt', '1. item');

    expect(result).toContain('## ROBOT GUIDANCE');
  });

  it('preserves numbering from the guidance string', () => {
    const guidance = '1. first\n2. second\n3. third';
    const result = injectGuidance('prompt', guidance);

    expect(result).toContain('1. first\n2. second\n3. third');
  });

  it('works with multiline prompts', () => {
    const prompt = 'Line one.\nLine two.\nLine three.';
    const guidance = '1. guidance';

    const result = injectGuidance(prompt, guidance);

    expect(result).toBe(
      'Line one.\nLine two.\nLine three.\n\n## ROBOT GUIDANCE\n1. guidance\n',
    );
  });

  it('handles single guidance entry', () => {
    const result = injectGuidance('prompt', '1. only one');

    expect(result).toBe('prompt\n\n## ROBOT GUIDANCE\n1. only one\n');
  });
});
