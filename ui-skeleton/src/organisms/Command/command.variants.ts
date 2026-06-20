import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root surface for the command-palette organism. Hosts the search input row,
 * separator, and items list inside a bordered card. The `size` axis carries
 * an empty class string here because per-row padding / font size lives on
 * the input, item, group-heading, and empty subpart cvas — the root frame
 * itself is size-invariant.
 */
export const commandVariants = cva(
  'flex w-full flex-col overflow-hidden rounded-md border border-border bg-background text-foreground shadow-elev-1',
  {
    variants: {
      size: {
        sm: '',
        md: '',
        lg: '',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type CommandVariants = VariantProps<typeof commandVariants>;

/**
 * Row wrapping the cmdk-wired search input and the optional leading icon.
 * Shares the wrapper-frame vocabulary with the Input atom (border-bottom +
 * focus-within tinting) but is intentionally inlined here rather than
 * importing `wrapperFrameVariants` — Command's input row sits inside the
 * Card-like root, so the all-around border + focus ring of the standalone
 * Input would double up against the root's border.
 */
export const commandInputWrapperVariants = cva(
  'flex items-center gap-2 border-b border-border text-foreground',
  {
    variants: {
      size: {
        sm: 'px-2 py-1.5 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-2.5 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Inner native `<input>` rendered as cmdk's CommandInput. Mirrors the Input
 * atom's `inputControlVariants` (transparent, flex-1, no outline, muted
 * placeholder) so the visual contract stays identical to the standalone
 * Input — see the InputGroup organism's compose-atom-primitives pattern in
 * `skills/organism-authoring/SKILL.md` for the precedent.
 */
export const commandInputControlVariants = cva(
  'min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
);

/**
 * Scrollable items region containing all rendered groups, items,
 * separators, and the cmdk-managed Empty. cmdk exposes a
 * `--cmdk-list-height` CSS variable that consumers can tap for height
 * animation; the organism leaves the variable in place by NOT setting an
 * explicit height here.
 */
export const commandListVariants = cva(
  'max-h-[300px] overflow-y-auto overflow-x-hidden p-1',
  {
    variants: {
      size: {
        sm: 'max-h-[240px]',
        md: 'max-h-[300px]',
        lg: 'max-h-[360px]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Selectable command row. cmdk sets `data-selected="true"` on the focused
 * row (keyboard or pointer) and `data-disabled="true"` on disabled rows —
 * the selectors below pick those up for the accent treatment, mirroring
 * the DropdownMenu / Menubar item vocabulary so muscle memory carries
 * across menu-shaped organisms.
 */
export const commandItemVariants = cva(
  'relative flex cursor-default select-none items-center gap-2 rounded-sm '
  + 'text-foreground outline-none transition-colors '
  + 'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground '
  + 'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
  {
    variants: {
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2 py-1.5 text-sm',
        lg: 'px-3 py-2 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Heading rendered above a group's items by cmdk's `CommandGroup heading`
 * prop. cmdk paints the heading via a `[cmdk-group-heading]` selector on a
 * private child — the selector targets that descendant on the rendered
 * Group so the heading inherits size-aware padding and the muted
 * vocabulary used by DropdownMenu / Menubar labels.
 */
export const commandGroupVariants = cva(
  'overflow-hidden text-foreground '
  + '[&_[cmdk-group-heading]]:select-none [&_[cmdk-group-heading]]:font-semibold '
  + '[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider '
  + '[&_[cmdk-group-heading]]:text-muted-foreground',
  {
    variants: {
      size: {
        sm: '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[0.625rem]',
        md: '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs',
        lg: '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-sm',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** Thin horizontal rule rendered between adjacent groups / sections. */
export const commandSeparatorVariants = cva('-mx-1 my-1 h-px bg-border');

/**
 * Message rendered when cmdk's filter returns zero matches for the active
 * search query. Visually subdued; sized to match the item row vocabulary
 * so the empty state sits at the same rhythm as a populated list.
 */
export const commandEmptyVariants = cva(
  'select-none text-center text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'py-4 text-xs',
        md: 'py-6 text-sm',
        lg: 'py-8 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Leading / trailing icon slot inside a Command row. Lines the icon up to
 * the row text baseline without extra wrapping. Matches DropdownMenu /
 * Menubar icon sizing so consumers carrying multiple menu-shaped organisms
 * see identical icon dimensions.
 */
export const commandIconVariants = cva('inline-flex shrink-0', {
  variants: {
    size: {
      sm: 'size-3',
      md: 'size-4',
      lg: 'size-5',
    },
  },
  defaultVariants: { size: 'md' },
});

/**
 * Trailing keyboard-shortcut hint rendered as a decorative `<kbd>`-styled
 * span next to the row label (e.g. `⌘K`, `Ctrl+P`). `ml-auto` pushes the
 * shortcut to the row's right edge so it sits opposite the leading icon.
 */
export const commandShortcutVariants = cva(
  'ml-auto inline-flex select-none items-center font-mono text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'text-[0.625rem] tracking-wider',
        md: 'text-xs tracking-wider',
        lg: 'text-sm tracking-wider',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
