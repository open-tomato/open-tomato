import type { IncomingMessage } from '@open-tomato/types';

import { describe, expect, it } from 'bun:test';

import { resolveSessionId } from '../resolve-session-id.js';

describe('resolveSessionId', () => {
  describe('@loop-id prefix routing', () => {
    it('extracts the session ID from a @prefix at the start of the message', () => {
      const message: IncomingMessage = { text: '@deploy check status' };

      expect(resolveSessionId(message)).toBe('deploy');
    });

    it('handles hyphenated loop IDs', () => {
      const message: IncomingMessage = { text: '@my-loop hello' };

      expect(resolveSessionId(message)).toBe('my-loop');
    });

    it('takes precedence over replyToSessionId', () => {
      const message: IncomingMessage = {
        text: '@prefix-id some text',
        replyToSessionId: 'reply-session',
      };

      expect(resolveSessionId(message)).toBe('prefix-id');
    });

    it('does not match a @mention in the middle of the text', () => {
      const message: IncomingMessage = { text: 'hello @deploy check' };

      expect(resolveSessionId(message)).toBe('main');
    });
  });

  describe('replyToSessionId routing', () => {
    it('returns replyToSessionId when no @prefix is present', () => {
      const message: IncomingMessage = {
        text: 'yes, proceed',
        replyToSessionId: 'session-42',
      };

      expect(resolveSessionId(message)).toBe('session-42');
    });
  });

  describe('default fallback', () => {
    it('returns "main" when no routing signal is present', () => {
      const message: IncomingMessage = { text: 'just a plain message' };

      expect(resolveSessionId(message)).toBe('main');
    });

    it('returns a custom default when provided', () => {
      const message: IncomingMessage = { text: 'plain message' };

      expect(resolveSessionId(message, 'fallback')).toBe('fallback');
    });

    it('returns default when replyToSessionId is undefined', () => {
      const message: IncomingMessage = {
        text: 'no prefix here',
        replyToSessionId: undefined,
      };

      expect(resolveSessionId(message, 'custom')).toBe('custom');
    });
  });
});
