import * as RadixDialog from '@radix-ui/react-dialog';
import * as React from 'react';

import { cn } from '@/particles/cn';

import {
  dialogBodyVariants,
  dialogContentSurfaceVariants,
  dialogContentVariants,
  dialogDescriptionVariants,
  dialogFooterVariants,
  dialogHeaderVariants,
  dialogOverlayVariants,
  dialogTitleVariants,
  type DialogVariants,
} from './dialog.variants';

type RadixDialogRootProps = React.ComponentPropsWithoutRef<
  typeof RadixDialog.Root
>;
type RadixDialogContentProps = React.ComponentPropsWithoutRef<
  typeof RadixDialog.Content
>;

/**
 * Dialog — portal-based organism that wraps `@radix-ui/react-dialog` for a
 * centered, focus-trapped modal surface. Pairs a consumer-supplied `trigger`
 * with a Content surface composing a `title`, optional `description`,
 * optional `header` override, body `children`, and an optional `footer`.
 *
 * @remarks
 * Dialog vs AlertDialog vs Drawer. Dialog is the general-purpose modal —
 * centered, scrim-modal, focus-trapped, dismisses on escape or outside-click,
 * and the consumer owns the close mechanism via `footer` + `onOpenChange`.
 * AlertDialog narrows the use case to confirm/cancel interruptions: it ships
 * `role="alertdialog"`, replaces the open `footer` slot with explicit
 * `confirmAction` + `cancelAction` slots, and refuses outside-click dismissal
 * because the choice is mandatory. Drawer is side-anchored and gesture-driven
 * for native-mobile-like sheets. Reach for Dialog whenever the surface is a
 * focused modal that is not strictly a confirm/cancel choice.
 *
 * All visual customization flows through `size` and `tone`. There is no
 * `className` escape hatch. The `tone` axis routes through the surface cva
 * sibling (see {@link dialogContentSurfaceVariants}) via a descendant
 * selector — `info` tints the title via `text-primary`, `neutral` keeps the
 * default `text-foreground`.
 *
 * `trigger` is wrapped internally via `<RadixDialog.Trigger asChild>` — pass
 * a `Button` atom (or any single React element with an accessible name) so
 * Radix can project its event handlers and ARIA attributes.
 *
 * Radix renders the Content with `role="dialog"` and auto-wires
 * `aria-labelledby` (Title) and `aria-describedby` (Description). Tests MUST
 * scan `document.body` with axe, not `container` — Radix portals into
 * `document.body` and a container-scoped scan misses the portaled Content.
 *
 * @example
 * ```tsx
 * <Dialog
 *   trigger={<Button>Edit profile</Button>}
 *   title="Edit profile"
 *   description="Update the public information shown on your profile."
 *   footer={
 *     <>
 *       <Button variant="outline">Cancel</Button>
 *       <Button>Save changes</Button>
 *     </>
 *   }
 * >
 *   <ProfileForm />
 * </Dialog>
 *
 * <Dialog
 *   size="lg"
 *   tone="info"
 *   trigger={<Button>What's new</Button>}
 *   title="What's new this week"
 *   description="A summary of the latest workspace updates."
 * >
 *   <ChangelogList />
 * </Dialog>
 * ```
 */
export interface DialogProps
  extends Omit<RadixDialogRootProps, 'children'>,
  DialogVariants {
  /**
   * Trigger element wrapped internally via Radix Trigger `asChild`. Must be
   * a single React element — fragments, strings, arrays, or `null` throw at
   * runtime when Radix calls `React.cloneElement` on the slot.
   */
  trigger: React.ReactElement;
  /**
   * Title rendered inside the Content via Radix Title. Required — Radix
   * auto-wires `aria-labelledby` to this element so axe's
   * `aria-dialog-name` rule passes for the portaled Content. When `header`
   * is supplied, the visible Title is replaced by the override but the Title
   * is still rendered visually-hidden (`sr-only`) to keep the
   * `aria-labelledby` wiring intact.
   */
  title: React.ReactNode;
  /**
   * Supporting description rendered beneath the title via Radix Description.
   * Radix auto-wires `aria-describedby` when present.
   */
  description?: React.ReactNode;
  /**
   * Overrides the default visible header layout. When supplied, the
   * consumer's content replaces the default `title` + `description`
   * rendering — `title` is still REQUIRED and is rendered visually-hidden
   * (`sr-only`) inside the Radix Title so axe's `aria-dialog-name` rule
   * keeps passing for the portaled Content. Use `header` only when a custom
   * heading layout (e.g. a leading icon + title row) is needed.
   */
  header?: React.ReactNode;
  /**
   * Bottom action row rendered after the body `children`. Typically holds a
   * primary Button + optional secondary actions. Consumers wire close
   * behavior via `onOpenChange` or by wrapping a Button in
   * `<RadixDialog.Close asChild>`.
   */
  footer?: React.ReactNode;
  /**
   * Body content rendered between the header and footer. Required for a
   * meaningful dialog.
   */
  children?: React.ReactNode;
  /**
   * Pass-through props for the underlying Radix Content (focus handlers,
   * escape-key handlers, etc.). `className` and `children` are owned by the
   * organism and excluded.
   */
  contentProps?: Omit<RadixDialogContentProps, 'className' | 'children'>;
}

export const Dialog = React.forwardRef<HTMLDivElement, DialogProps>((
  {
    size,
    tone,
    trigger,
    title,
    description,
    header,
    footer,
    children,
    contentProps,
    ...rest
  },
  ref,
) => {
  const resolvedSize = size ?? 'md';
  const resolvedTone = tone ?? 'neutral';

  return (
    <RadixDialog.Root {...rest}>
      <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          data-slot="dialog-overlay"
          className={cn(dialogOverlayVariants())}
        />
        <RadixDialog.Content
          ref={ref}
          data-slot="dialog-content"
          data-size={resolvedSize}
          data-tone={resolvedTone}
          className={cn(
            dialogContentVariants({
              size: resolvedSize,
              tone: resolvedTone,
            }),
            dialogContentSurfaceVariants({
              size: resolvedSize,
              tone: resolvedTone,
            }),
          )}
          {...contentProps}
        >
          {header !== undefined
            ? (
              <div
                data-slot="dialog-header"
                className={cn(dialogHeaderVariants())}
              >
                {header}
                <RadixDialog.Title
                  data-slot="dialog-title"
                  className="sr-only"
                >
                  {title}
                </RadixDialog.Title>
                {description !== undefined
                  ? (
                    <RadixDialog.Description
                      data-slot="dialog-description"
                      className="sr-only"
                    >
                      {description}
                    </RadixDialog.Description>
                  )
                  : null}
              </div>
            )
            : (
              <div
                data-slot="dialog-header"
                className={cn(dialogHeaderVariants())}
              >
                <RadixDialog.Title
                  data-slot="dialog-title"
                  className={cn(dialogTitleVariants({ size: resolvedSize }))}
                >
                  {title}
                </RadixDialog.Title>
                {description !== undefined
                  ? (
                    <RadixDialog.Description
                      data-slot="dialog-description"
                      className={cn(dialogDescriptionVariants())}
                    >
                      {description}
                    </RadixDialog.Description>
                  )
                  : null}
              </div>
            )}
          {children !== undefined
            ? (
              <div data-slot="dialog-body" className={cn(dialogBodyVariants())}>
                {children}
              </div>
            )
            : null}
          {footer !== undefined
            ? (
              <div
                data-slot="dialog-footer"
                className={cn(dialogFooterVariants())}
              >
                {footer}
              </div>
            )
            : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
});
Dialog.displayName = 'Dialog';
