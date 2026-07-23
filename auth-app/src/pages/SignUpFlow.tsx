import { SignupEmailPage } from '@open-tomato/ui-components';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  FlowScreen,
  initialSignUp,
  signUpReduce,
  type SignUpState,
} from '../auth';

import { AuthBanner } from './shared/AuthBanner';

/**
 * Email sign-up (step 1). `SignupEmailPage` owns username/email/password
 * internally; we harvest email + password and read the username off the
 * `@`-prefixed handle input via the container. On success, hand the new user to
 * workspace pick with a `signup` intent so it ends on the Done splash.
 */
export const SignUpFlow = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<SignUpState>(initialSignUp);

  useEffect(() => {
    if (state.step === 'workspace' && state.user != null) {
      navigate('/workspace', { state: { userId: state.user.id, intent: 'signup' } });
    }
  }, [state.step, state.user, navigate]);

  return (
    <FlowScreen
      onPrimary={(fields, container) => {
        // Username is the handle input (prefixed `@`, not email/password).
        const username = Array.from(container.querySelectorAll('input'))
          .find((i) => i.type !== 'email' && i.type !== 'password')?.value ?? '';
        void signUpReduce(state, {
          kind: 'submitEmail',
          email: fields.email ?? '',
          username,
          password: fields.password ?? '',
        }).then(setState);
      }}
    >
      {state.error != null && <AuthBanner message={state.error} />}
      <SignupEmailPage />
    </FlowScreen>
  );
};
