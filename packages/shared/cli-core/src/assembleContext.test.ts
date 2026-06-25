import type { CliOutputStream } from './output';

import { describe, expect, it } from 'vitest';

import { assembleContext } from './assembleContext';

const silentStream: CliOutputStream = {
  write(): unknown {
    return true;
  },
};

describe('assembleContext outputMode resolution', () => {
  it('defaults to text mode when no flag, env, or force is provided', () => {
    const context = assembleContext({
      argv: ['svc', 'validate'],
      env: {},
      stream: silentStream,
    });

    expect(context.outputMode).toBe('text');
  });

  it('uses --output=json flag to select json mode', () => {
    const context = assembleContext({
      argv: ['svc', '--output=json'],
      env: {},
      stream: silentStream,
    });

    expect(context.outputMode).toBe('json');
  });

  it('uses TOMATO_OUTPUT=json env var when no flag is provided', () => {
    const context = assembleContext({
      argv: ['svc'],
      env: { TOMATO_OUTPUT: 'json' },
      stream: silentStream,
    });

    expect(context.outputMode).toBe('json');
  });

  it('--output flag wins over TOMATO_OUTPUT env var', () => {
    const context = assembleContext({
      argv: ['svc', '--output=text'],
      env: { TOMATO_OUTPUT: 'json' },
      stream: silentStream,
    });

    expect(context.outputMode).toBe('text');
  });

  it('--output=json flag wins over TOMATO_OUTPUT=text env var', () => {
    const context = assembleContext({
      argv: ['svc', '--output=json'],
      env: { TOMATO_OUTPUT: 'text' },
      stream: silentStream,
    });

    expect(context.outputMode).toBe('json');
  });

  it('forceOutputMode arg wins over --output flag and env var', () => {
    const context = assembleContext({
      argv: ['svc', '--output=json'],
      env: { TOMATO_OUTPUT: 'json' },
      forceOutputMode: 'text',
      stream: silentStream,
    });

    expect(context.outputMode).toBe('text');
  });

  it('forceOutputMode=json overrides --output=text and env=text', () => {
    const context = assembleContext({
      argv: ['svc', '--output=text'],
      env: { TOMATO_OUTPUT: 'text' },
      forceOutputMode: 'json',
      stream: silentStream,
    });

    expect(context.outputMode).toBe('json');
  });
});

describe('assembleContext verbosity resolution', () => {
  it('defaults to verbosity 0 with no flags or env', () => {
    const context = assembleContext({
      argv: ['svc'],
      env: {},
      stream: silentStream,
    });

    expect(context.verbosity).toBe(0);
  });

  it('clamps repeated -v tokens above 3 down to 3', () => {
    const context = assembleContext({
      argv: ['-v', '-v', '-v', '-v', '-v'],
      env: {},
      stream: silentStream,
    });

    expect(context.verbosity).toBe(3);
  });

  it('clamps --verbose=99 down to 3', () => {
    const context = assembleContext({
      argv: ['--verbose=99'],
      env: {},
      stream: silentStream,
    });

    expect(context.verbosity).toBe(3);
  });

  it('clamps a negative TOMATO_VERBOSITY down to 0', () => {
    const context = assembleContext({
      argv: ['svc'],
      env: { TOMATO_VERBOSITY: '-5' },
      stream: silentStream,
    });

    expect(context.verbosity).toBe(0);
  });

  it('uses TOMATO_VERBOSITY when no verbose flag is provided', () => {
    const context = assembleContext({
      argv: ['svc'],
      env: { TOMATO_VERBOSITY: '2' },
      stream: silentStream,
    });

    expect(context.verbosity).toBe(2);
  });

  it('clamps TOMATO_VERBOSITY=10 down to 3', () => {
    const context = assembleContext({
      argv: ['svc'],
      env: { TOMATO_VERBOSITY: '10' },
      stream: silentStream,
    });

    expect(context.verbosity).toBe(3);
  });

  it('parses single -v as verbosity 1', () => {
    const context = assembleContext({
      argv: ['-v', '--env=staging'],
      env: {},
      stream: silentStream,
    });

    expect(context.verbosity).toBe(1);
  });
});

describe('assembleContext returns a frozen context', () => {
  it('freezes the top-level context object', () => {
    const context = assembleContext({
      argv: ['svc'],
      env: {},
      stream: silentStream,
    });

    expect(Object.isFrozen(context)).toBe(true);
  });

  it('freezes the flags object', () => {
    const context = assembleContext({
      argv: ['--env=staging'],
      env: {},
      stream: silentStream,
    });

    expect(Object.isFrozen(context.flags)).toBe(true);
  });

  it('freezes the args array', () => {
    const context = assembleContext({
      argv: ['svc', 'validate'],
      env: {},
      stream: silentStream,
    });

    expect(Object.isFrozen(context.args)).toBe(true);
  });

  it('freezes the env object', () => {
    const context = assembleContext({
      argv: ['svc'],
      env: { TOMATO_OUTPUT: 'text' },
      stream: silentStream,
    });

    expect(Object.isFrozen(context.env)).toBe(true);
  });

  it('throws when mutating an existing flag property in strict mode', () => {
    const context = assembleContext({
      argv: ['--env=staging'],
      env: {},
      stream: silentStream,
    });

    expect(() => {
      (context.flags as Record<string, string | boolean>).env = 'production';
    }).toThrow(TypeError);
  });

  it('throws when adding a new flag property in strict mode', () => {
    const context = assembleContext({
      argv: ['--env=staging'],
      env: {},
      stream: silentStream,
    });

    expect(() => {
      (context.flags as Record<string, string | boolean>).newFlag = 'value';
    }).toThrow(TypeError);
  });

  it('throws when reassigning context.outputMode in strict mode', () => {
    const context = assembleContext({
      argv: ['svc'],
      env: {},
      stream: silentStream,
    });

    expect(() => {
      (context as { outputMode: 'text' | 'json' }).outputMode = 'json';
    }).toThrow(TypeError);
  });
});

describe('assembleContext signal handling', () => {
  it('uses the provided AbortSignal when one is passed in', () => {
    const controller = new AbortController();
    const context = assembleContext({
      argv: ['svc'],
      env: {},
      signal: controller.signal,
      stream: silentStream,
    });

    expect(context.signal).toBe(controller.signal);
  });

  it('provides a default AbortSignal when none is passed in', () => {
    const context = assembleContext({
      argv: ['svc'],
      env: {},
      stream: silentStream,
    });

    expect(context.signal).toBeInstanceOf(AbortSignal);
    expect(context.signal.aborted).toBe(false);
  });
});
