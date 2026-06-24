import { describe, expect, it } from 'bun:test';

import { GuidanceAccumulator } from '../guidance-accumulator.js';

describe('GuidanceAccumulator', () => {
  it('accumulates multiple entries for a session', () => {
    const acc = new GuidanceAccumulator();
    acc.add('s1', 'first');
    acc.add('s1', 'second');
    acc.add('s1', 'third');

    const result = acc.flush('s1');
    expect(result).toBe('1. first\n2. second\n3. third');
  });

  it('flush returns numbered list', () => {
    const acc = new GuidanceAccumulator();
    acc.add('s1', 'alpha');
    acc.add('s1', 'beta');

    const result = acc.flush('s1');
    expect(result).toBe('1. alpha\n2. beta');
  });

  it('flush clears the store for the session', () => {
    const acc = new GuidanceAccumulator();
    acc.add('s1', 'guidance');

    acc.flush('s1');
    const second = acc.flush('s1');
    expect(second).toBeNull();
  });

  it('flush on empty session returns null', () => {
    const acc = new GuidanceAccumulator();
    expect(acc.flush('unknown')).toBeNull();
  });

  it('isolates guidance between sessions', () => {
    const acc = new GuidanceAccumulator();
    acc.add('s1', 'for-s1');
    acc.add('s2', 'for-s2');

    expect(acc.flush('s1')).toBe('1. for-s1');
    expect(acc.flush('s2')).toBe('1. for-s2');
  });

  it('flush does not affect other sessions', () => {
    const acc = new GuidanceAccumulator();
    acc.add('s1', 'a');
    acc.add('s2', 'b');

    acc.flush('s1');
    expect(acc.flush('s2')).toBe('1. b');
  });
});
