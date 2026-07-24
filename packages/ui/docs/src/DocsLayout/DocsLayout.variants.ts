import { cva, type VariantProps } from 'class-variance-authority';

/**
 * DocsLayout — the three-column docs shell: a 220px sidebar, a fluid article
 * column, and a 200px on-page TOC rail, centered to the content width. This
 * is the shell the docs site renders pages into.
 */
export const portalDocsLayout = cva(
  'mx-auto grid max-w-[var(--content-max)] grid-cols-[220px_1fr_200px] gap-10 px-7 pt-8',
);

export type PortalDocsLayoutVariants = VariantProps<typeof portalDocsLayout>;
