import { LoginPage, ResetCodePage } from '@open-tomato/ui-components';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { FlowScreen } from './FlowScreen';

/**
 * Guards the library-gap seam: the published templates expose no callbacks, so
 * FlowScreen must translate CTA / OAuth clicks into flow events and harvest the
 * field values from the DOM. If the library's markup changes (primary variant
 * class, provider label), these break loudly instead of the flows silently
 * going dead.
 */
describe('FlowScreen delegation', () => {
  test('the primary CTA fires onPrimary with harvested field values', () => {
    const onPrimary = vi.fn();
    render(
      <FlowScreen onPrimary={onPrimary}>
        <LoginPage />
      </FlowScreen>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    // LoginPage seeds the email field — proves the harvest read the live DOM.
    const [fields] = onPrimary.mock.calls[0] ?? [];
    expect(fields?.email).toBe('sam@open-tomato.dev');
  });

  test('an OAuth row fires onOAuth with the provider', () => {
    const onOAuth = vi.fn();
    render(
      <FlowScreen onOAuth={onOAuth}>
        <LoginPage />
      </FlowScreen>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Continue with GitHub/i }));
    expect(onOAuth).toHaveBeenCalledWith('github');
  });

  test('harvests a multi-cell CodeInput into one joined code string', () => {
    // The harvest predicate (maxLength===1 && inputMode==='numeric') is the
    // seam's most brittle assumption — pin it against the real CodeInput markup.
    const onPrimary = vi.fn();
    render(
      <FlowScreen onPrimary={onPrimary}>
        <ResetCodePage />
      </FlowScreen>,
    );
    Array.from('123456').forEach((digit, i) => {
      fireEvent.change(screen.getByLabelText(`digit ${i + 1} of 6`), { target: { value: digit } });
    });
    fireEvent.click(screen.getByRole('button', { name: /Reset password & sign in/i }));
    const [fields] = onPrimary.mock.calls[0] ?? [];
    expect(fields?.code).toBe('123456');
  });

  test('unrelated controls (password toggle) do not trigger flow events', () => {
    const onPrimary = vi.fn();
    const onOAuth = vi.fn();
    render(
      <FlowScreen onPrimary={onPrimary} onOAuth={onOAuth}>
        <LoginPage />
      </FlowScreen>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Show password/i }));
    expect(onPrimary).not.toHaveBeenCalled();
    expect(onOAuth).not.toHaveBeenCalled();
  });
});
