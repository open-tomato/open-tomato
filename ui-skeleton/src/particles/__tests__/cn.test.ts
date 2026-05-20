import { describe, expect, it } from 'vitest';

import { cn } from '../cn';

describe('cn', () => {
  it('returns a string', () => {
    expect(typeof cn('text-sm')).toBe('string');
  });

  it('joins multiple class strings with spaces', () => {
    expect(cn('text-sm', 'font-medium')).toBe('text-sm font-medium');
  });

  it('returns an empty string when given no arguments', () => {
    expect(cn()).toBe('');
  });

  it('filters out falsy values (false, null, undefined, 0, empty string)', () => {
    expect(cn('a', false, null, undefined, 0, '', 'b')).toBe('a b');
  });

  it('flattens arrays of class names', () => {
    expect(cn(['text-sm', 'font-medium'], 'text-foreground')).toBe(
      'text-sm font-medium text-foreground',
    );
  });

  it('honors clsx object syntax with truthy/falsy keys', () => {
    expect(cn('base', { active: true, disabled: false, hidden: undefined })).toBe(
      'base active',
    );
  });

  describe('tailwind-merge conflict resolution', () => {
    it('keeps the last conflicting padding utility', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('keeps the last conflicting background color', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });

    it('keeps the last conflicting text color', () => {
      expect(cn('text-foreground', 'text-muted-foreground')).toBe(
        'text-muted-foreground',
      );
    });

    it('does not merge classes that target different properties', () => {
      const result = cn('text-sm', 'font-medium', 'leading-tight');
      expect(result).toContain('text-sm');
      expect(result).toContain('font-medium');
      expect(result).toContain('leading-tight');
    });

    it('resolves conflicts within a single argument string', () => {
      expect(cn('px-2 px-4 px-6')).toBe('px-6');
    });

    it('resolves conflicts between responsive variants independently', () => {
      const result = cn('px-2 md:px-4', 'md:px-8');
      expect(result).toContain('px-2');
      expect(result).toContain('md:px-8');
      expect(result).not.toContain('md:px-4');
    });

    it('resolves conflicts between pseudo-class variants independently', () => {
      expect(cn('hover:bg-red-500', 'hover:bg-blue-500')).toBe('hover:bg-blue-500');
    });

    it('treats base and variant classes as separate scopes', () => {
      const result = cn('bg-red-500 hover:bg-blue-500', 'bg-green-500');
      expect(result).toContain('hover:bg-blue-500');
      expect(result).toContain('bg-green-500');
      expect(result).not.toContain('bg-red-500');
    });

    it('lets a later argument override an earlier conflicting class (className escape hatch)', () => {
      const base = 'inline-flex items-center rounded-md bg-primary text-primary-foreground';
      const override = 'bg-destructive';
      const result = cn(base, override);
      expect(result).toContain('bg-destructive');
      expect(result).not.toContain('bg-primary');
      expect(result).toContain('text-primary-foreground');
      expect(result).toContain('inline-flex');
    });

    it('resolves conflicts mixed with clsx conditional inputs', () => {
      const isActive = true;
      const result = cn('px-2', { 'px-4': isActive }, ['px-6']);
      expect(result).toBe('px-6');
    });
  });
});
