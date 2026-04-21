import { describe, expect, it } from 'vitest';

import { classifyExitError } from './error-classifier.js';

describe('classifyExitError', () => {
  describe('auth_failure', () => {
    it('returns auth_failure for exit code 41', () => {
      expect(classifyExitError(41, '')).toBe('auth_failure');
    });

    it('returns auth_failure when stderr contains "auth"', () => {
      expect(classifyExitError(1, 'authentication failed')).toBe('auth_failure');
    });

    it('returns auth_failure when stderr contains "401"', () => {
      expect(classifyExitError(1, 'HTTP 401 Unauthorized')).toBe('auth_failure');
    });

    it('returns auth_failure for exit code 41 even with empty stderr', () => {
      expect(classifyExitError(41, '')).toBe('auth_failure');
    });

    it('returns auth_failure when exit code 41 and stderr also matches rate limit', () => {
      // auth_failure has higher priority than rate_limit
      expect(classifyExitError(41, '429 rate limit exceeded')).toBe('auth_failure');
    });

    it('is case-insensitive for auth pattern', () => {
      expect(classifyExitError(null, 'AUTH token invalid')).toBe('auth_failure');
    });
  });

  describe('rate_limit', () => {
    it('returns rate_limit when stderr contains "429"', () => {
      expect(classifyExitError(1, 'error: 429 Too Many Requests')).toBe('rate_limit');
    });

    it('returns rate_limit when stderr contains "rate limit"', () => {
      expect(classifyExitError(1, 'rate limit exceeded')).toBe('rate_limit');
    });

    it('returns rate_limit when stderr contains "quota exceeded"', () => {
      expect(classifyExitError(1, 'quota exceeded for today')).toBe('rate_limit');
    });

    it('is case-insensitive for rate limit pattern', () => {
      expect(classifyExitError(1, 'Rate Limit hit')).toBe('rate_limit');
    });

    it('returns rate_limit with null exit code when stderr matches', () => {
      expect(classifyExitError(null, '429 rate limit')).toBe('rate_limit');
    });

    it('returns rate_limit when stderr contains "RESOURCE_EXHAUSTED" (Gemini CLI)', () => {
      expect(
        classifyExitError(1, '[API Error: quota limit reached (Status: RESOURCE_EXHAUSTED)]'),
      ).toBe('rate_limit');
    });

    it('returns rate_limit for Codex "usage limit" messages', () => {
      expect(
        classifyExitError(
          1,
          'ERROR: You\'ve hit your usage limit for GPT-4. Switch to another model now, or try again after 3:00 PM.',
        ),
      ).toBe('rate_limit');
    });

    it('returns rate_limit for Claude overloaded (529) errors', () => {
      expect(classifyExitError(1, 'API Error: Overloaded')).toBe('rate_limit');
    });

    it('returns rate_limit for Codex server overloaded errors', () => {
      expect(
        classifyExitError(1, 'Codex is currently experiencing high load. Overloaded'),
      ).toBe('rate_limit');
    });

    it('returns rate_limit for Codex retry limit with 429 status', () => {
      expect(
        classifyExitError(1, 'ERROR: exceeded retry limit, last status: 429'),
      ).toBe('rate_limit');
    });

    it('does not match 429 as a substring in larger numbers', () => {
      expect(classifyExitError(1, 'request id 14290')).toBe('unknown');
    });
  });

  describe('task_error', () => {
    it('returns task_error when stderr contains "400"', () => {
      expect(classifyExitError(1, 'HTTP 400 Bad Request')).toBe('task_error');
    });

    it('returns task_error when stderr contains "invalid request"', () => {
      expect(classifyExitError(1, 'invalid request: missing field')).toBe('task_error');
    });

    it('returns task_error when stderr contains "context length"', () => {
      expect(classifyExitError(1, 'context length exceeded maximum')).toBe('task_error');
    });

    it('returns task_error when stderr contains "context window" (Codex CLI)', () => {
      expect(classifyExitError(1, 'ContextWindowExceeded: context window exceeded')).toBe(
        'task_error',
      );
    });

    it('is case-insensitive for task error pattern', () => {
      expect(classifyExitError(1, 'Invalid Request body')).toBe('task_error');
    });

    it('returns task_error with null exit code when stderr matches', () => {
      expect(classifyExitError(null, '400 invalid request')).toBe('task_error');
    });

    it('does not match 400 as a substring in larger numbers', () => {
      expect(classifyExitError(1, 'listening on port 14001')).toBe('unknown');
    });
  });

  describe('unknown', () => {
    it('returns unknown for null exit code with empty stderr', () => {
      expect(classifyExitError(null, '')).toBe('unknown');
    });

    it('returns unknown for non-special exit code with empty stderr', () => {
      expect(classifyExitError(1, '')).toBe('unknown');
    });

    it('returns unknown for exit code 0 with empty stderr', () => {
      expect(classifyExitError(0, '')).toBe('unknown');
    });

    it('returns unknown for unrecognized stderr content', () => {
      expect(classifyExitError(1, 'segmentation fault (core dumped)')).toBe('unknown');
    });

    it('returns unknown for exit code 137 (OOM kill) with no matching stderr', () => {
      expect(classifyExitError(137, 'killed')).toBe('unknown');
    });
  });

  describe('priority order', () => {
    it('auth_failure takes priority over task_error when both patterns match', () => {
      expect(classifyExitError(1, 'auth failed: 400 invalid request')).toBe('auth_failure');
    });

    it('auth_failure via stderr takes priority over rate_limit in stderr', () => {
      expect(classifyExitError(1, '401 unauthorized: 429 rate limit')).toBe('auth_failure');
    });

    it('auth_failure via exit code 41 takes priority over task_error in stderr', () => {
      expect(classifyExitError(41, '400 invalid request')).toBe('auth_failure');
    });

    it('rate_limit takes priority over task_error when both patterns match', () => {
      expect(classifyExitError(1, '429 rate limit: 400 invalid')).toBe('rate_limit');
    });
  });

  describe('edge cases', () => {
    it('handles multiline stderr matching on a later line', () => {
      const stderr = 'starting process...\nconnecting to API\nerror: 429 Too Many Requests';
      expect(classifyExitError(1, stderr)).toBe('rate_limit');
    });

    it('handles null exit code with auth pattern in stderr', () => {
      expect(classifyExitError(null, '401 Unauthorized')).toBe('auth_failure');
    });

    it('returns unknown for null exit code with whitespace-only stderr', () => {
      expect(classifyExitError(null, '   \n\t  ')).toBe('unknown');
    });

    it('matches "400" when it appears as a standalone status code', () => {
      expect(classifyExitError(1, 'HTTP/1.1 400 Bad Request')).toBe('task_error');
    });

    it('returns unknown for unrelated numeric stderr', () => {
      expect(classifyExitError(1, 'process exited with code 2')).toBe('unknown');
    });
  });
});
