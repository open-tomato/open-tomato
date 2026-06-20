import { describe, expect, it } from 'vitest';

import { wrapperFrameVariants } from '../wrapper-frame.variants';

describe('wrapperFrameVariants', () => {
  it('returns a string', () => {
    expect(typeof wrapperFrameVariants()).toBe('string');
  });

  it('emits the base block on every call', () => {
    const result = wrapperFrameVariants();
    expect(result).toContain('flex');
    expect(result).toContain('w-full');
    expect(result).toContain('items-center');
    expect(result).toContain('gap-2');
    expect(result).toContain('rounded-md');
    expect(result).toContain('transition-colors');
    expect(result).toContain('focus-within:outline-none');
    expect(result).toContain('focus-within:ring-2');
    expect(result).toContain('focus-within:ring-offset-2');
  });

  describe('default variants', () => {
    it('applies the default variant axis values when called with no arguments', () => {
      const result = wrapperFrameVariants();
      expect(result).toContain('border-input');
      expect(result).toContain('focus-within:ring-ring');
      expect(result).toContain('h-9');
      expect(result).toContain('px-3');
      expect(result).toContain('border');
      expect(result).toContain('bg-background');
    });

    it('matches the explicit default axis values', () => {
      const explicit = wrapperFrameVariants({
        variant: 'default',
        size: 'md',
        density: 'comfortable',
        tone: 'neutral',
      });
      expect(explicit).toBe(wrapperFrameVariants());
    });
  });

  describe('variant axis', () => {
    it('applies default validation styles', () => {
      const result = wrapperFrameVariants({ variant: 'default' });
      expect(result).toContain('border-input');
      expect(result).toContain('focus-within:ring-ring');
    });

    it('applies error validation styles', () => {
      const result = wrapperFrameVariants({ variant: 'error' });
      expect(result).toContain('border-destructive');
      expect(result).toContain('focus-within:ring-destructive');
    });

    it('applies success validation styles', () => {
      const result = wrapperFrameVariants({ variant: 'success' });
      expect(result).toContain('border-emerald-500');
      expect(result).toContain('focus-within:ring-emerald-500');
    });
  });

  describe('size axis', () => {
    it('applies sm sizing', () => {
      const result = wrapperFrameVariants({ size: 'sm' });
      expect(result).toContain('h-8');
      expect(result).toContain('px-2.5');
      expect(result).toContain('text-xs');
    });

    it('applies md sizing', () => {
      const result = wrapperFrameVariants({ size: 'md' });
      expect(result).toContain('h-9');
      expect(result).toContain('px-3');
    });

    it('applies lg sizing', () => {
      const result = wrapperFrameVariants({ size: 'lg' });
      expect(result).toContain('h-10');
      expect(result).toContain('px-3.5');
      expect(result).toContain('text-base');
    });
  });

  describe('density axis', () => {
    it('leaves the size-derived height untouched in comfortable density', () => {
      const result = wrapperFrameVariants({ size: 'md', density: 'comfortable' });
      expect(result).toContain('h-9');
      expect(result).not.toContain('[&]:h-7');
      expect(result).not.toContain('py-0');
    });

    it('overrides size-derived height with a compact row in compact density', () => {
      const result = wrapperFrameVariants({ size: 'md', density: 'compact' });
      expect(result).toContain('[&]:h-7');
      expect(result).toContain('py-0');
    });

    it('keeps the compact override regardless of size axis', () => {
      const sm = wrapperFrameVariants({ size: 'sm', density: 'compact' });
      const lg = wrapperFrameVariants({ size: 'lg', density: 'compact' });
      expect(sm).toContain('[&]:h-7');
      expect(lg).toContain('[&]:h-7');
    });
  });

  describe('tone axis', () => {
    it('applies neutral tone with a visible border and background', () => {
      const result = wrapperFrameVariants({ tone: 'neutral' });
      expect(result).toContain('border');
      expect(result).toContain('bg-background');
    });

    it('applies subtle tone for embedded use', () => {
      const result = wrapperFrameVariants({ tone: 'subtle' });
      expect(result).toContain('border-0');
      expect(result).toContain('bg-muted/40');
    });

    it('applies inverted tone for dark backdrops', () => {
      const result = wrapperFrameVariants({ tone: 'inverted' });
      expect(result).toContain('border-foreground/20');
      expect(result).toContain('bg-foreground');
      expect(result).toContain('text-background');
    });
  });

  describe('axis composition', () => {
    it('combines variant, size, density, and tone in a single call', () => {
      const result = wrapperFrameVariants({
        variant: 'error',
        size: 'lg',
        density: 'compact',
        tone: 'inverted',
      });
      expect(result).toContain('border-destructive');
      expect(result).toContain('focus-within:ring-destructive');
      expect(result).toContain('h-10');
      expect(result).toContain('px-3.5');
      expect(result).toContain('[&]:h-7');
      expect(result).toContain('py-0');
      expect(result).toContain('bg-foreground');
      expect(result).toContain('text-background');
    });

    it('treats axes independently — toggling one does not change the others', () => {
      const a = wrapperFrameVariants({ variant: 'success', size: 'sm' });
      const b = wrapperFrameVariants({ variant: 'success', size: 'lg' });
      expect(a).toContain('border-emerald-500');
      expect(b).toContain('border-emerald-500');
      expect(a).toContain('h-8');
      expect(b).toContain('h-10');
    });
  });
});
