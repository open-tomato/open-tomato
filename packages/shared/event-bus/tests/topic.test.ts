import { describe, expect, it } from 'vitest';

import { isWildcardPattern, matchTopic } from '../src/topic';

describe('matchTopic', () => {
  describe('exact match', () => {
    it('returns true for identical topic', () => {
      expect(matchTopic('build.done', 'build.done')).toBe(true);
    });

    it('returns false for differing topic', () => {
      expect(matchTopic('build.done', 'build.started')).toBe(false);
    });
  });

  describe('global wildcard *', () => {
    it('matches any topic string', () => {
      expect(matchTopic('*', 'build.done')).toBe(true);
      expect(matchTopic('*', 'impl.started')).toBe(true);
      expect(matchTopic('*', 'anything')).toBe(true);
    });
  });

  describe('suffix wildcard (impl.*)', () => {
    it('matches impl.done', () => {
      expect(matchTopic('impl.*', 'impl.done')).toBe(true);
    });

    it('matches impl.started', () => {
      expect(matchTopic('impl.*', 'impl.started')).toBe(true);
    });

    it('does not match build.done', () => {
      expect(matchTopic('impl.*', 'build.done')).toBe(false);
    });
  });

  describe('prefix wildcard (*.done)', () => {
    it('matches build.done', () => {
      expect(matchTopic('*.done', 'build.done')).toBe(true);
    });

    it('matches review.done', () => {
      expect(matchTopic('*.done', 'review.done')).toBe(true);
    });

    it('does not match build.started', () => {
      expect(matchTopic('*.done', 'build.started')).toBe(false);
    });
  });
});

describe('isWildcardPattern', () => {
  it('returns true for global wildcard *', () => {
    expect(isWildcardPattern('*')).toBe(true);
  });

  it('returns true for suffix wildcard impl.*', () => {
    expect(isWildcardPattern('impl.*')).toBe(true);
  });

  it('returns true for prefix wildcard *.done', () => {
    expect(isWildcardPattern('*.done')).toBe(true);
  });

  it('returns false for exact pattern build.done', () => {
    expect(isWildcardPattern('build.done')).toBe(false);
  });
});
