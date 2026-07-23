import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, test } from 'vitest';

import { ThemeProvider } from '../theme/ThemeProvider';

import { authRoutes } from './routes';

const renderAt = (path: string) => {
  const router = createMemoryRouter(authRoutes, { initialEntries: [path] });
  return render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
};

/** [path, distinctive on-screen copy] — one per major auth screen. */
const SCREEN_CASES: Array<[string, string]> = [
  ['/login', 'Tend to your agents, check the harvest.'],
  ['/signup', 'Plant your account'],
  ['/signup/oauth/google', 'One more thing'],
  ['/signup/done', 'next steps'],
  ['/workspace', 'Pick a workspace'],
  ['/workspace?kind=fresh', 'Your workspace'],
  ['/forgot', 'Forgot your password?'],
  ['/reset', 'Set a new password'],
  ['/2fa', 'Add a second factor'],
];

describe('auth route table', () => {
  test.each(SCREEN_CASES)('renders the screen at %s', async (path, copy) => {
    renderAt(path);
    expect(await screen.findByText(copy)).toBeTruthy();
  });

  test('the root redirects to /login', async () => {
    renderAt('/');
    expect(await screen.findByText('welcome back')).toBeTruthy();
  });

  test('an unknown path falls through to /login', async () => {
    renderAt('/definitely-not-a-route');
    expect(await screen.findByText('welcome back')).toBeTruthy();
  });

  test('an invalid OAuth provider redirects to /login', async () => {
    renderAt('/signup/oauth/myspace');
    expect(await screen.findByText('welcome back')).toBeTruthy();
  });
});
