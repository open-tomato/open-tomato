import { describe, expect, it } from 'vitest';

import {
  abortCommandSchema,
  followUpCommandSchema,
  getIterationsCommandSchema,
  getStateCommandSchema,
  guidanceCommandSchema,
  promptCommandSchema,
  rpcCommandSchema,
  setHatCommandSchema,
  steerCommandSchema,
} from './commands.js';

// ---------------------------------------------------------------------------
// prompt
// ---------------------------------------------------------------------------

describe('promptCommandSchema', () => {
  it('accepts a valid prompt command', () => {
    const result = promptCommandSchema.parse({
      method: 'prompt',
      params: { text: 'Hello world' },
    });

    expect(result.method).toBe('prompt');
    expect(result.params.text).toBe('Hello world');
  });

  it('accepts optional hat and maxIterations', () => {
    const result = promptCommandSchema.parse({
      method: 'prompt',
      params: { text: 'Go', hat: 'planner', maxIterations: 5 },
    });

    expect(result.params.hat).toBe('planner');
    expect(result.params.maxIterations).toBe(5);
  });

  it('rejects empty text', () => {
    expect(() => promptCommandSchema.parse({ method: 'prompt', params: { text: '' } })).toThrow();
  });

  it('rejects missing text field', () => {
    expect(() => promptCommandSchema.parse({ method: 'prompt', params: {} })).toThrow();
  });

  it('rejects non-positive maxIterations', () => {
    expect(() => promptCommandSchema.parse({
      method: 'prompt',
      params: { text: 'Go', maxIterations: 0 },
    })).toThrow();
  });

  it('rejects fractional maxIterations', () => {
    expect(() => promptCommandSchema.parse({
      method: 'prompt',
      params: { text: 'Go', maxIterations: 2.5 },
    })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// guidance
// ---------------------------------------------------------------------------

describe('guidanceCommandSchema', () => {
  it('accepts a valid guidance command with default appliesTo', () => {
    const result = guidanceCommandSchema.parse({
      method: 'guidance',
      params: { text: 'Focus on tests' },
    });

    expect(result.params.appliesTo).toBe('remaining');
  });

  it('accepts explicit appliesTo value', () => {
    const result = guidanceCommandSchema.parse({
      method: 'guidance',
      params: { text: 'Focus', appliesTo: 'current_iteration' },
    });

    expect(result.params.appliesTo).toBe('current_iteration');
  });

  it('rejects empty text', () => {
    expect(() => guidanceCommandSchema.parse({
      method: 'guidance',
      params: { text: '' },
    })).toThrow();
  });

  it('rejects invalid appliesTo value', () => {
    expect(() => guidanceCommandSchema.parse({
      method: 'guidance',
      params: { text: 'Focus', appliesTo: 'never' },
    })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// steer
// ---------------------------------------------------------------------------

describe('steerCommandSchema', () => {
  it('accepts a valid steer command with default force', () => {
    const result = steerCommandSchema.parse({
      method: 'steer',
      params: { directive: 'Skip tests' },
    });

    expect(result.params.force).toBe(false);
  });

  it('accepts explicit force=true', () => {
    const result = steerCommandSchema.parse({
      method: 'steer',
      params: { directive: 'Skip tests', force: true },
    });

    expect(result.params.force).toBe(true);
  });

  it('rejects empty directive', () => {
    expect(() => steerCommandSchema.parse({
      method: 'steer',
      params: { directive: '' },
    })).toThrow();
  });

  it('rejects missing directive', () => {
    expect(() => steerCommandSchema.parse({ method: 'steer', params: {} })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// follow_up
// ---------------------------------------------------------------------------

describe('followUpCommandSchema', () => {
  it('accepts a valid follow_up command', () => {
    const result = followUpCommandSchema.parse({
      method: 'follow_up',
      params: { text: 'Also fix the bug' },
    });

    expect(result.params.text).toBe('Also fix the bug');
  });

  it('rejects empty text', () => {
    expect(() => followUpCommandSchema.parse({
      method: 'follow_up',
      params: { text: '' },
    })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// abort
// ---------------------------------------------------------------------------

describe('abortCommandSchema', () => {
  it('accepts abort with a reason', () => {
    const result = abortCommandSchema.parse({
      method: 'abort',
      params: { reason: 'User cancelled' },
    });

    expect(result.params.reason).toBe('User cancelled');
  });

  it('accepts abort without a reason', () => {
    const result = abortCommandSchema.parse({
      method: 'abort',
      params: {},
    });

    expect(result.params.reason).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// get_state
// ---------------------------------------------------------------------------

describe('getStateCommandSchema', () => {
  it('accepts get_state with no params', () => {
    const result = getStateCommandSchema.parse({ method: 'get_state' });

    expect(result.method).toBe('get_state');
  });
});

// ---------------------------------------------------------------------------
// get_iterations
// ---------------------------------------------------------------------------

describe('getIterationsCommandSchema', () => {
  it('accepts get_iterations with after and limit', () => {
    const result = getIterationsCommandSchema.parse({
      method: 'get_iterations',
      params: { after: 5, limit: 10 },
    });

    expect(result.params.after).toBe(5);
    expect(result.params.limit).toBe(10);
  });

  it('accepts get_iterations with no optional fields', () => {
    const result = getIterationsCommandSchema.parse({
      method: 'get_iterations',
      params: {},
    });

    expect(result.params.after).toBeUndefined();
    expect(result.params.limit).toBeUndefined();
  });

  it('rejects negative after value', () => {
    expect(() => getIterationsCommandSchema.parse({
      method: 'get_iterations',
      params: { after: -1 },
    })).toThrow();
  });

  it('rejects zero limit', () => {
    expect(() => getIterationsCommandSchema.parse({
      method: 'get_iterations',
      params: { limit: 0 },
    })).toThrow();
  });

  it('rejects fractional after value', () => {
    expect(() => getIterationsCommandSchema.parse({
      method: 'get_iterations',
      params: { after: 1.5 },
    })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// set_hat
// ---------------------------------------------------------------------------

describe('setHatCommandSchema', () => {
  it('accepts a valid set_hat command', () => {
    const result = setHatCommandSchema.parse({
      method: 'set_hat',
      params: { hatId: 'developer' },
    });

    expect(result.params.hatId).toBe('developer');
  });

  it('rejects empty hatId', () => {
    expect(() => setHatCommandSchema.parse({
      method: 'set_hat',
      params: { hatId: '' },
    })).toThrow();
  });

  it('rejects missing hatId', () => {
    expect(() => setHatCommandSchema.parse({ method: 'set_hat', params: {} })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// rpcCommandSchema — discriminated union
// ---------------------------------------------------------------------------

describe('rpcCommandSchema', () => {
  it('narrows to prompt command', () => {
    const result = rpcCommandSchema.parse({
      method: 'prompt',
      params: { text: 'Hello' },
    });

    expect(result.method).toBe('prompt');
  });

  it('narrows to get_state command', () => {
    const result = rpcCommandSchema.parse({ method: 'get_state' });

    expect(result.method).toBe('get_state');
  });

  it('rejects unknown method discriminant', () => {
    expect(() => rpcCommandSchema.parse({
      method: 'unknown_command',
      params: {},
    })).toThrow();
  });

  it('rejects missing method field', () => {
    expect(() => rpcCommandSchema.parse({ params: { text: 'Hello' } })).toThrow();
  });

  it('rejects completely empty object', () => {
    expect(() => rpcCommandSchema.parse({})).toThrow();
  });

  it('rejects non-object input', () => {
    expect(() => rpcCommandSchema.parse('not an object')).toThrow();
    expect(() => rpcCommandSchema.parse(42)).toThrow();
    expect(() => rpcCommandSchema.parse(null)).toThrow();
  });
});
