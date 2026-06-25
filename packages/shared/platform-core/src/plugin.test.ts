import type { PlatformPlugin } from './plugin';
import type { EmitResult, MatchResult, ValidationResult } from './types';

import { describe, expectTypeOf, it } from 'vitest';

const matchResult: MatchResult = { matches: false, score: 0, missing: [] };
const validationResult: ValidationResult = { valid: true, errors: [], warnings: [] };
const emitResult: EmitResult = { targets: [], lockHash: '' };

describe('PlatformPlugin structural contract', () => {
  it('accepts a plain object that implements every member', () => {
    const plugin: PlatformPlugin = {
      name: 'example',
      version: '0.0.0',
      matchCapabilities: async () => matchResult,
      resolvePlatformRefs: async (template) => template,
      validateProvision: async () => validationResult,
      emit: async () => emitResult,
    };

    expectTypeOf(plugin).toMatchTypeOf<PlatformPlugin>();
  });

  it('rejects an object missing `matchCapabilities`', () => {
    // @ts-expect-error - matchCapabilities is required by PlatformPlugin
    const plugin: PlatformPlugin = {
      name: 'missing-matchCapabilities',
      version: '0.0.0',
      resolvePlatformRefs: async (template) => template,
      validateProvision: async () => validationResult,
      emit: async () => emitResult,
    };
    expectTypeOf(plugin).toMatchTypeOf<PlatformPlugin>();
  });

  it('rejects an object missing `resolvePlatformRefs`', () => {
    // @ts-expect-error - resolvePlatformRefs is required by PlatformPlugin
    const plugin: PlatformPlugin = {
      name: 'missing-resolvePlatformRefs',
      version: '0.0.0',
      matchCapabilities: async () => matchResult,
      validateProvision: async () => validationResult,
      emit: async () => emitResult,
    };
    expectTypeOf(plugin).toMatchTypeOf<PlatformPlugin>();
  });

  it('rejects an object missing `validateProvision`', () => {
    // @ts-expect-error - validateProvision is required by PlatformPlugin
    const plugin: PlatformPlugin = {
      name: 'missing-validateProvision',
      version: '0.0.0',
      matchCapabilities: async () => matchResult,
      resolvePlatformRefs: async (template) => template,
      emit: async () => emitResult,
    };
    expectTypeOf(plugin).toMatchTypeOf<PlatformPlugin>();
  });

  it('rejects an object missing `emit`', () => {
    // @ts-expect-error - emit is required by PlatformPlugin
    const plugin: PlatformPlugin = {
      name: 'missing-emit',
      version: '0.0.0',
      matchCapabilities: async () => matchResult,
      resolvePlatformRefs: async (template) => template,
      validateProvision: async () => validationResult,
    };
    expectTypeOf(plugin).toMatchTypeOf<PlatformPlugin>();
  });

  it('rejects an object missing `name`', () => {
    // @ts-expect-error - name is required by PlatformPlugin
    const plugin: PlatformPlugin = {
      version: '0.0.0',
      matchCapabilities: async () => matchResult,
      resolvePlatformRefs: async (template) => template,
      validateProvision: async () => validationResult,
      emit: async () => emitResult,
    };
    expectTypeOf(plugin).toMatchTypeOf<PlatformPlugin>();
  });

  it('rejects an object missing `version`', () => {
    // @ts-expect-error - version is required by PlatformPlugin
    const plugin: PlatformPlugin = {
      name: 'missing-version',
      matchCapabilities: async () => matchResult,
      resolvePlatformRefs: async (template) => template,
      validateProvision: async () => validationResult,
      emit: async () => emitResult,
    };
    expectTypeOf(plugin).toMatchTypeOf<PlatformPlugin>();
  });
});
