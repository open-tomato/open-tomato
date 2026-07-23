import {
  ForgotEmailPage,
  ForgotSentPage,
  ResetCodePage,
  ResetDonePage,
} from '@open-tomato/ui-components';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

import {
  FlowScreen,
  completeSignIn,
  initialReset,
  resetReduce,
  type ResetState,
  type ResetStep,
} from '../auth';

import { AuthBanner } from './shared/AuthBanner';

/**
 * Password-reset flow: email → sent → code → done. `/forgot` enters at the
 * email step; `/reset` (the emailed deep-link) enters directly at code entry.
 */
export const ResetFlow = ({ initialStep = 'email' }: { initialStep?: ResetStep }) => {
  const location = useLocation();
  const [state, setState] = useState<ResetState>(() => {
    const base = initialReset();
    const email = new URLSearchParams(location.search).get('email') ?? '';
    return { ...base, step: initialStep, email };
  });

  useEffect(() => {
    if (state.step === 'done' && state.tokens != null) {
      completeSignIn(state.tokens, location.search);
    }
  }, [state.step, state.tokens, location.search]);

  if (state.step === 'sent') {
    return (
      <FlowScreen onPrimary={() => void resetReduce(state, { kind: 'advance' }).then(setState)}>
        <ForgotSentPage />
      </FlowScreen>
    );
  }

  if (state.step === 'code') {
    return (
      <FlowScreen
        onPrimary={(fields) => void resetReduce(state, {
          kind: 'resetPassword', code: fields.code ?? '', newPassword: fields.password ?? '',
        }).then(setState)}
      >
        {state.error != null && <AuthBanner message={state.error} />}
        <ResetCodePage />
      </FlowScreen>
    );
  }

  if (state.step === 'done') {
    return (
      <FlowScreen>
        <ResetDonePage />
      </FlowScreen>
    );
  }

  // email (default)
  return (
    <FlowScreen
      onPrimary={(fields) => void resetReduce(state, {
        kind: 'requestCode', email: fields.email ?? '',
      }).then(setState)}
    >
      <ForgotEmailPage />
    </FlowScreen>
  );
};
