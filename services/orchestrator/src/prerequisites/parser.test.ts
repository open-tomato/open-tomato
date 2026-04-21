import { describe, expect, it } from 'vitest';

import { parsePrerequisites } from './parser.js';

// ---------------------------------------------------------------------------
// Basic parsing
// ---------------------------------------------------------------------------

describe('parsePrerequisites', () => {
  it('returns an empty array for empty content', () => {
    expect(parsePrerequisites('')).toEqual([]);
  });

  it('returns an empty array when all items are already checked', () => {
    const content = '- [x] Already done\n- [X] Also done\n';
    expect(parsePrerequisites(content)).toEqual([]);
  });

  it('ignores BLOCKED items', () => {
    const content = '- [BLOCKED] Stuck item\n';
    expect(parsePrerequisites(content)).toEqual([]);
  });

  it('parses a single unchecked item with no tag (defaults to human)', () => {
    const content = '- [ ] Confirm backup completed\n';
    const items = parsePrerequisites(content);
    expect(items).toHaveLength(1);
    expect(items[0]!.description).toBe('Confirm backup completed');
    expect(items[0]!.tag).toBe('human');
    expect(items[0]!.lineIndex).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Inline tag resolution
  // ---------------------------------------------------------------------------

  it('respects explicit [auto] inline tag', () => {
    const content = '- [ ] [auto] Bun is installed (`bun --version`)\n';
    const items = parsePrerequisites(content);
    expect(items[0]!.tag).toBe('auto');
    expect(items[0]!.description).toBe('Bun is installed (`bun --version`)');
    expect(items[0]!.probeCommand).toBe('bun --version');
  });

  it('respects explicit [human] inline tag', () => {
    const content = '- [ ] [human] Approve the deployment plan\n';
    const items = parsePrerequisites(content);
    expect(items[0]!.tag).toBe('human');
    expect(items[0]!.probeCommand).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Section-header tag inheritance
  // ---------------------------------------------------------------------------

  it('inherits auto tag from [auto] section header', () => {
    const content = '## Automated Checks [auto]\n\n- [ ] Node ≥ 20 installed (`node --version`)\n';
    const items = parsePrerequisites(content);
    expect(items[0]!.tag).toBe('auto');
    expect(items[0]!.probeCommand).toBe('node --version');
  });

  it('inherits human tag from Manual section header', () => {
    const content = '## Manual Steps\n\n- [ ] Review the release notes\n';
    const items = parsePrerequisites(content);
    expect(items[0]!.tag).toBe('human');
  });

  it('inherits human tag from Sign-Off section header', () => {
    const content = '## Sign-Off Required\n\n- [ ] Tech lead sign-off\n';
    const items = parsePrerequisites(content);
    expect(items[0]!.tag).toBe('human');
  });

  it('inline tag overrides section-header default', () => {
    const content = '## Automated Checks [auto]\n\n- [ ] [human] Manual override item\n';
    const items = parsePrerequisites(content);
    expect(items[0]!.tag).toBe('human');
  });

  // ---------------------------------------------------------------------------
  // Probe command extraction
  // ---------------------------------------------------------------------------

  it('extracts probe command from backtick-wrapped token', () => {
    const content = '- [ ] [auto] Docker is running (`docker info`)\n';
    const items = parsePrerequisites(content);
    expect(items[0]!.probeCommand).toBe('docker info');
  });

  it('does not extract probeCommand for human items', () => {
    const content = '- [ ] [human] Run `some-command` manually\n';
    const items = parsePrerequisites(content);
    expect(items[0]!.probeCommand).toBeUndefined();
  });

  it('sets probeCommand to undefined when no backtick token present', () => {
    const content = '- [ ] [auto] Check that the service is reachable\n';
    const items = parsePrerequisites(content);
    expect(items[0]!.probeCommand).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Mixed document
  // ---------------------------------------------------------------------------

  it('parses a realistic mixed document correctly', () => {
    const content = [
      '# Prerequisites',
      '',
      '## Automated Checks [auto]',
      '',
      '- [x] Already done',
      '- [ ] Bun installed (`bun --version`)',
      '- [ ] [human] Override to human',
      '',
      '## Manual Steps',
      '',
      '- [ ] Confirm backup',
      '- [x] Already confirmed',
    ].join('\n');

    const items = parsePrerequisites(content);
    expect(items).toHaveLength(3);

    expect(items[0]!.tag).toBe('auto');
    expect(items[0]!.probeCommand).toBe('bun --version');

    expect(items[1]!.tag).toBe('human');
    expect(items[1]!.probeCommand).toBeUndefined();

    expect(items[2]!.description).toBe('Confirm backup');
    expect(items[2]!.tag).toBe('human');
  });

  it('preserves the original raw line', () => {
    const raw = '- [ ] [auto] Raw line (`cmd`)';
    const items = parsePrerequisites(raw);
    expect(items[0]!.raw).toBe(raw);
  });
});
