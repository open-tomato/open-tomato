import { cva, type VariantProps } from 'class-variance-authority';

/**
 * CodeBlock — the standalone charcoal code block for docs/blog prose
 * (rendered by DocsLayout + BlogPost). A dark `<pre>` with a subtle border
 * and horizontal scroll.
 *
 * The `!` overrides beat the theme's unlayered `pre` element rule (which
 * would otherwise fill it with the light `code-bg` and a soft border) — the
 * same override pattern CodeQuickstart's terminal `<pre>` uses. Kept dark in
 * both themes on purpose: a terminal transcript reads as an inverted surface.
 */
export const codeBlockPre = cva([
  'my-3.5 overflow-x-auto rounded-sm px-[18px] py-3.5',
  'font-mono !text-[13px] !leading-[1.55]',
  '!border !border-char-200 !bg-char-500 !text-cream-100',
]);

export type CodeBlockVariants = VariantProps<typeof codeBlockPre>;
