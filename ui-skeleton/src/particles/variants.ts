import { cva, type VariantProps } from 'class-variance-authority';

export { cva };
export type { VariantProps };

/**
 * Shared size scale used across atoms (Button, Input, Badge, Avatar, ...).
 * Each atom owns the concrete class strings; this type only standardizes the keys.
 */
export type Size = 'sm' | 'md' | 'lg';

/**
 * Common orientation keys shared across atoms (Separator, ScrollArea, Slider, Toggle).
 */
export type Orientation = 'horizontal' | 'vertical';

/**
 * Common validation intent keys shared across input-like atoms (Input, Textarea).
 */
export type Intent = 'default' | 'error' | 'success';

/**
 * Semantic variant keys shared across atoms that expose a `variant` axis
 * (Button, Badge, Toggle, ...). Atoms may use a subset.
 */
export type SemanticVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive';
