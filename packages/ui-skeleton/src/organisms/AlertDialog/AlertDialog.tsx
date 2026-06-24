import * as RadixAlertDialog from '@radix-ui/react-alert-dialog';
import * as React from 'react';

import { type ButtonVariants } from '@/atoms/Button';
import { cn } from '@/particles/cn';

import {
  alertDialogContentSurfaceVariants,
  alertDialogContentVariants,
  alertDialogDescriptionVariants,
  alertDialogFooterVariants,
  alertDialogHeaderVariants,
  alertDialogOverlayVariants,
  alertDialogTitleVariants,
  type AlertDialogVariants,
} from './alert-dialog.variants';

type RadixAlertDialogRootProps = React.ComponentPropsWithoutRef<
  typeof RadixAlertDialog.Root
>;
type RadixAlertDialogContentProps = React.ComponentPropsWithoutRef<
  typeof RadixAlertDialog.Content
>;

type ButtonVariant = NonNullable<ButtonVariants['variant']>;

/**
 * Lookup table from the organism's `severity` axis to the confirm Button
 * atom's `variant` axis. The Button atom does not ship a dedicated warning
 * variant, so info and warning both resolve to `primary` — severity is
 * communicated through the title / description copy and the consumer's icon
 * choice, while `danger` swaps the confirm Button to the destructive
 * treatment.
 */
const buttonVariantForSeverity: Record<
  NonNullable<AlertDialogVariants['severity']>,
  ButtonVariant
> = {
  info: 'primary',
  warning: 'primary',
  danger: 'destructive',
};

/**
 * AlertDialog — portal-based organism that wraps `@radix-ui/react-alert-dialog`
 * for a confirm/cancel-style modal interruption. Pairs a consumer-supplied
 * `trigger` with a centered Content surface composing a `title`,
 * optional `description`, and a two-button footer driven by the
 * `confirmAction` / `cancelAction` slots.
 *
 * @remarks All visual customization flows through `size` and `severity`.
 * There is no `className` escape hatch. The `severity` axis maps to the
 * confirm Button's `variant` axis via the {@link buttonVariantForSeverity}
 * lookup table (`info | warning → primary`, `danger → destructive`) — the
 * organism injects the resolved variant onto the consumer's confirm Button
 * via `React.cloneElement`, overriding any explicit `variant` prop the
 * consumer set so severity stays the single source of truth for the
 * confirm Button treatment. The cancel Button is rendered as-is so consumers
 * keep full control of its variant.
 *
 * `trigger`, `confirmAction`, and `cancelAction` are wrapped internally via
 * `<RadixAlertDialog.Trigger asChild>`, `<RadixAlertDialog.Action asChild>`,
 * and `<RadixAlertDialog.Cancel asChild>` respectively — pass a `Button` atom
 * (or any single React element with an accessible name) so Radix can project
 * its event handlers and ARIA attributes.
 *
 * Radix renders the Content with `role="alertdialog"` and auto-wires
 * `aria-labelledby` (Title) and `aria-describedby` (Description). Tests
 * MUST scan `document.body` with axe, not `container` — Radix portals into
 * `document.body` and a container-scoped scan misses the portaled Content.
 *
 * @example
 * ```tsx
 * <AlertDialog
 *   severity="danger"
 *   trigger={<Button variant="destructive">Delete account</Button>}
 *   title="Delete your account?"
 *   description="This action is permanent and cannot be undone."
 *   confirmAction={<Button>Delete account</Button>}
 *   cancelAction={<Button variant="outline">Cancel</Button>}
 * />
 *
 * <AlertDialog
 *   size="lg"
 *   severity="warning"
 *   trigger={<Button>Continue</Button>}
 *   title="You have unsaved changes"
 *   description="Leaving this page will discard them."
 *   confirmAction={<Button>Discard and continue</Button>}
 *   cancelAction={<Button variant="ghost">Stay</Button>}
 * />
 * ```
 */
export interface AlertDialogProps
  extends Omit<RadixAlertDialogRootProps, 'children'>,
  AlertDialogVariants {
  /**
   * Trigger element wrapped internally via Radix Trigger `asChild`. Must be a
   * single React element — fragments, strings, arrays, or `null` throw at
   * runtime when Radix calls `React.cloneElement` on the slot.
   */
  trigger: React.ReactElement;
  /**
   * Title rendered inside the Content via Radix Title. Required — Radix
   * auto-wires `aria-labelledby` to this element so axe's
   * `aria-dialog-name` rule passes for the portaled Content.
   */
  title: React.ReactNode;
  /**
   * Supporting description rendered beneath the title via Radix Description.
   * Radix auto-wires `aria-describedby` when present.
   */
  description?: React.ReactNode;
  /**
   * Confirm Button element wrapped internally via Radix Action `asChild`.
   * The organism clones it with the severity-mapped `variant` (see
   * {@link buttonVariantForSeverity}). Must be a single React element.
   */
  confirmAction: React.ReactElement<{ variant?: ButtonVariant }>;
  /**
   * Cancel Button element wrapped internally via Radix Cancel `asChild`.
   * Rendered as-is — the consumer keeps control of the cancel variant.
   * Must be a single React element.
   */
  cancelAction: React.ReactElement;
  /**
   * Pass-through props for the underlying Radix Content (focus handlers,
   * escape-key handlers, etc.). `className` and `children` are owned by the
   * organism and excluded.
   */
  contentProps?: Omit<
    RadixAlertDialogContentProps,
    'className' | 'children'
  >;
}

export const AlertDialog = React.forwardRef<
  HTMLDivElement,
  AlertDialogProps
>((
  {
    size,
    severity,
    trigger,
    title,
    description,
    confirmAction,
    cancelAction,
    contentProps,
    ...rest
  },
  ref,
) => {
  const resolvedSize = size ?? 'md';
  const resolvedSeverity = severity ?? 'info';

  const confirmWithVariant = React.cloneElement(confirmAction, {
    variant: buttonVariantForSeverity[resolvedSeverity],
  });

  return (
    <RadixAlertDialog.Root {...rest}>
      <RadixAlertDialog.Trigger asChild>{trigger}</RadixAlertDialog.Trigger>
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay
          data-slot="alert-dialog-overlay"
          className={cn(alertDialogOverlayVariants())}
        />
        <RadixAlertDialog.Content
          ref={ref}
          data-slot="alert-dialog-content"
          data-size={resolvedSize}
          data-severity={resolvedSeverity}
          className={cn(
            alertDialogContentVariants({
              size: resolvedSize,
              severity: resolvedSeverity,
            }),
            alertDialogContentSurfaceVariants({ size: resolvedSize }),
          )}
          {...contentProps}
        >
          <div
            data-slot="alert-dialog-header"
            className={cn(alertDialogHeaderVariants())}
          >
            <RadixAlertDialog.Title
              data-slot="alert-dialog-title"
              className={cn(alertDialogTitleVariants({ size: resolvedSize }))}
            >
              {title}
            </RadixAlertDialog.Title>
            {description !== undefined
              ? (
                <RadixAlertDialog.Description
                  data-slot="alert-dialog-description"
                  className={cn(alertDialogDescriptionVariants())}
                >
                  {description}
                </RadixAlertDialog.Description>
              )
              : null}
          </div>
          <div
            data-slot="alert-dialog-footer"
            className={cn(alertDialogFooterVariants())}
          >
            <RadixAlertDialog.Cancel asChild>
              {cancelAction}
            </RadixAlertDialog.Cancel>
            <RadixAlertDialog.Action asChild>
              {confirmWithVariant}
            </RadixAlertDialog.Action>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  );
});
AlertDialog.displayName = 'AlertDialog';
