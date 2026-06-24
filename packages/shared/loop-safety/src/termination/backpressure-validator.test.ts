import { beforeEach, describe, expect, it } from 'bun:test';

import { BackpressureValidator } from './backpressure-validator';

describe('BackpressureValidator', () => {
  let validator: BackpressureValidator;

  beforeEach(() => {
    validator = new BackpressureValidator();
  });

  // ---------------------------------------------------------------------------
  // validateJsonl
  // ---------------------------------------------------------------------------

  describe('validateJsonl', () => {
    it('returns null for a valid JSON object', () => {
      expect(validator.validateJsonl('{"topic":"task.done","source":"agent-1"}')).toBeNull();
    });

    it('returns null for a valid JSON string', () => {
      expect(validator.validateJsonl('"hello"')).toBeNull();
    });

    it('returns null for a valid JSON number', () => {
      expect(validator.validateJsonl('42')).toBeNull();
    });

    it('returns null for a valid JSON array', () => {
      expect(validator.validateJsonl('[1,2,3]')).toBeNull();
    });

    it('returns an error string for a truncated object', () => {
      const result = validator.validateJsonl('{"topic":');
      expect(result).not.toBeNull();
      expect(result).toMatch(/Invalid JSONL/);
    });

    it('returns an error string for plain text', () => {
      const result = validator.validateJsonl('not json at all');
      expect(result).not.toBeNull();
      expect(result).toMatch(/Invalid JSONL/);
    });

    it('returns an error string for an empty string', () => {
      const result = validator.validateJsonl('');
      expect(result).not.toBeNull();
      expect(result).toMatch(/Invalid JSONL/);
    });
  });

  // ---------------------------------------------------------------------------
  // recordMalformed / recordValid
  // ---------------------------------------------------------------------------

  describe('recordMalformed', () => {
    it('returns false on the first malformed record', () => {
      expect(validator.recordMalformed()).toBe(false);
    });

    it('returns false on the second consecutive malformed record', () => {
      validator.recordMalformed();
      expect(validator.recordMalformed()).toBe(false);
    });

    it('returns true on the third consecutive malformed record (threshold)', () => {
      validator.recordMalformed();
      validator.recordMalformed();
      expect(validator.recordMalformed()).toBe(true);
    });

    it('returns true on subsequent malformed records beyond the threshold', () => {
      validator.recordMalformed();
      validator.recordMalformed();
      validator.recordMalformed();
      expect(validator.recordMalformed()).toBe(true);
    });
  });

  describe('recordValid', () => {
    it('resets the malformed counter so threshold is no longer exceeded', () => {
      validator.recordMalformed();
      validator.recordMalformed();
      validator.recordValid();
      // After reset, two more malformed are needed before threshold
      expect(validator.recordMalformed()).toBe(false);
      expect(validator.recordMalformed()).toBe(false);
      expect(validator.recordMalformed()).toBe(true);
    });

    it('has no effect on a fresh validator', () => {
      validator.recordValid();
      expect(validator.recordMalformed()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // validateBuildEvidence
  // ---------------------------------------------------------------------------

  describe('validateBuildEvidence', () => {
    it('returns null when all present fields pass', () => {
      expect(
        validator.validateBuildEvidence({ tests: 'pass', lint: 'pass', typecheck: 'pass' }),
      ).toBeNull();
    });

    it('returns null when only one field is present and it passes', () => {
      expect(validator.validateBuildEvidence({ tests: 'pass' })).toBeNull();
    });

    it('returns null when a field is skipped', () => {
      expect(
        validator.validateBuildEvidence({ tests: 'pass', lint: 'skip' }),
      ).toBeNull();
    });

    it('returns a reason string when tests fail', () => {
      const result = validator.validateBuildEvidence({ tests: 'fail', lint: 'pass' });
      expect(result).not.toBeNull();
      expect(result).toMatch(/tests/);
    });

    it('returns a reason string when lint fails', () => {
      const result = validator.validateBuildEvidence({ tests: 'pass', lint: 'fail' });
      expect(result).not.toBeNull();
      expect(result).toMatch(/lint/);
    });

    it('returns a reason string when typecheck fails', () => {
      const result = validator.validateBuildEvidence({ typecheck: 'fail' });
      expect(result).not.toBeNull();
      expect(result).toMatch(/typecheck/);
    });

    it('returns a reason string when evidence is an empty object (no known fields)', () => {
      const result = validator.validateBuildEvidence({});
      expect(result).not.toBeNull();
      expect(result).toMatch(/at least one/);
    });

    it('returns a reason string when evidence is null', () => {
      const result = validator.validateBuildEvidence(null);
      expect(result).not.toBeNull();
    });

    it('returns a reason string when evidence is a string', () => {
      const result = validator.validateBuildEvidence('pass');
      expect(result).not.toBeNull();
    });

    it('returns a reason string when evidence is undefined', () => {
      const result = validator.validateBuildEvidence(undefined);
      expect(result).not.toBeNull();
    });

    it('ignores unknown extra fields and validates only known ones', () => {
      expect(
        validator.validateBuildEvidence({ tests: 'pass', unknownField: 'fail' }),
      ).toBeNull();
    });
  });
});
