import { Icon } from '@open-tomato/ui-components';

/**
 * Flow-level error banner rendered above an auth screen. Used for outcomes the
 * template has no inline slot for (OAuth denial, a wrong 2FA code, an expired
 * reset). The `!` on the color keeps it above the tokens.css `@layer base`
 * element defaults.
 */
export const AuthBanner = ({ message, tone = 'danger' }: { message: string; tone?: 'danger' | 'info' }) => (
  <div
    role="alert"
    className={`mx-auto mt-8 flex w-full max-w-[460px] items-start gap-2 rounded-md border px-3 py-2 text-[13px] leading-snug ${
      tone === 'danger'
        ? 'border-danger/40 bg-danger/10 !text-danger'
        : 'border-border-soft bg-surface-sunk !text-fg2'
    }`}
  >
    <Icon name={tone === 'danger'
      ? 'circle-alert'
      : 'info'} size={14} className="mt-0.5 shrink-0" />
    <span>{message}</span>
  </div>
);
