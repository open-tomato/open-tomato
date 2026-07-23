import type { RouteObject } from 'react-router';

import { Navigate } from 'react-router';

import {
  EnrollFlow,
  OAuthConfirmFlow,
  ResetFlow,
  SignInFlow,
  SignUpFlow,
  SignupDoneRoute,
  WorkspaceFlow,
} from '../pages';

/**
 * Auth gateway route table. Each flow has a single entry URL and advances in
 * place (internal state machine). `/reset` is the emailed deep-link landing
 * that drops straight into code entry.
 *
 *   /login              Sign in (email + OAuth, → optional 2FA challenge)
 *   /signup             Sign up (email) → workspace → done
 *   /signup/oauth/:p    OAuth sign-up confirm (pick handle) → workspace → done
 *   /signup/done        Sign-up complete
 *   /workspace          Workspace pick (invited · ?kind=fresh self-serve)
 *   /forgot             Reset: email → sent → code → done
 *   /reset              Reset deep-link landing (code entry)
 *   /2fa                Two-factor enrollment (TOTP · Passkey)
 */
export const authRoutes: RouteObject[] = [
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <SignInFlow /> },
  { path: '/signup', element: <SignUpFlow /> },
  { path: '/signup/oauth/:provider', element: <OAuthConfirmFlow /> },
  { path: '/signup/done', element: <SignupDoneRoute /> },
  { path: '/workspace', element: <WorkspaceFlow /> },
  { path: '/forgot', element: <ResetFlow initialStep="email" /> },
  { path: '/reset', element: <ResetFlow initialStep="code" /> },
  { path: '/2fa', element: <EnrollFlow /> },
  { path: '*', element: <Navigate to="/login" replace /> },
];
