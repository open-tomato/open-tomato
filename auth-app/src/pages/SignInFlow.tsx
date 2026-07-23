import { LoginPage, TwoFactorPage } from '@open-tomato/ui-components';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import {
  FlowScreen,
  initialSignIn,
  signInReduce,
  type SignInEvent,
  type SignInState,
} from '../auth';
import { oauthConfirmPath } from '../routes/paths';

import { AuthBanner } from './shared/AuthBanner';

/**
 * Sign-in flow — credentials (+ OAuth) then an optional TOTP challenge, then
 * hand off to workspace pick. Wraps the presentational `LoginPage` /
 * `TwoFactorPage` templates in `FlowScreen` to turn their inert CTAs into flow
 * events (see FlowScreen for the library-gap rationale).
 */
export const SignInFlow = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [state, setState] = useState<SignInState>(initialSignIn);

  // Each render's handler closes over the current `state`, so the reduce always
  // sees the latest — one click → one async → setState → re-render.
  const run = (event: SignInEvent) => {
    void signInReduce(state, event).then(setState);
  };

  useEffect(() => {
    if (state.step === 'authenticated' && state.userId != null) {
      navigate('/workspace', { state: { userId: state.userId, intent: 'signin' } });
    } else if (state.step === 'oauthProfile' && state.provider != null) {
      navigate(oauthConfirmPath(state.provider), { state: { intent: 'signup' } });
    }
  }, [state.step, state.userId, state.provider, navigate]);

  if (state.step === 'twoFactor') {
    return (
      <FlowScreen onPrimary={(f) => run({ kind: 'submitCode', code: f.code ?? '' })}>
        {state.error != null && <AuthBanner message={state.error} />}
        <TwoFactorPage step="confirm" />
      </FlowScreen>
    );
  }

  // credentials (default). `deny=1` lets the walkthrough exercise OAuth denial.
  const simulate = params.get('deny') === '1'
    ? 'denied'
    : undefined;
  return (
    <FlowScreen
      onPrimary={(f) => run({ kind: 'submitEmail', email: f.email ?? '', password: f.password ?? '' })}
      onOAuth={(provider) => run({ kind: 'oauth', provider, simulate })}
    >
      {state.errorKind === 'oauth' && state.error != null && <AuthBanner message={state.error} />}
      <LoginPage
        mode={state.errorKind === 'credentials'
          ? 'error'
          : 'default'}
        onForgot={() => navigate('/forgot')}
        onSignup={() => navigate('/signup')}
      />
    </FlowScreen>
  );
};
