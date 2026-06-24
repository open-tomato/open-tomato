import { cva, type VariantProps } from 'class-variance-authority';

import { buttonBaseEffects } from '@/atoms/Button/button.variants';
/**
 * Organism for switching between workspaces/teams/accounts. Renders as a
 * dropdown in the sidebar header, but the logic and styling are reusable for
 * other contexts (topbar, settings page) so we isolate it in its own component.
 * The `isCompact` prop controls whether the selector is in a sidebar rail (icon
 * only) or expanded (icon + label), and the styles adjust accordingly: the
 * compact version centers the icon, while the expanded version left-aligns it.
 */

export const workspaceSelectorVariants = cva(
  'pt-3 px-3 pb-2',
  {
    variants: {
      isCompact: {
        true: '',
        false: '',
      },
    },
    // when `isCompact` is true, we set `justify-center` to center the icon in the rail. When false, we set `justify-start` to left-align the content in the expanded sidebar.
    defaultVariants: { isCompact: false },
  },
);

export const workspaceButtonAsSelectorVariants = cva(
  'w-full bg-surface-sunk border border-border-soft rounded-md ' +
  ' px-2 py-2 flex items-center gap-2 text-left text-fg1  ' + 
  ' font-body text-sm cursor-pointer' +
  buttonBaseEffects,
  {
    variants: {
      isCompact: {
        true: '',
        false: '',
      },
    },
    // the button styles don't change based on `isCompact`, but we include it as a variant so we can reuse the same component API for both the sidebar header and other contexts where the workspace selector might be used (topbar, settings page).
    defaultVariants: { isCompact: false },
  },
);

export type WorkspaceButtonAsSelectorVariants = VariantProps<typeof workspaceButtonAsSelectorVariants>;

export type WorkspaceSelectorVariants = VariantProps<typeof workspaceSelectorVariants>;
