import { OAuthConfirmPage } from '@open-tomato/ui-components';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';

import {
  FlowScreen,
  initialSignUp,
  signUpReduce,
  type OAuthProvider,
  type SignUpState,
} from '../auth';

const isProvider = (v: string | undefined): v is OAuthProvider => v === 'google' || v === 'github';

/**
 * OAuth sign-up confirm — pick a handle for a new federated identity, then
 * proceed to workspace pick. `OAuthConfirmPage` renders two text inputs
 * (username, then display name) which we read positionally at submit.
 */
export const OAuthConfirmFlow = () => {
  const navigate = useNavigate();
  const { provider } = useParams();
  const [state, setState] = useState<SignUpState>(initialSignUp);

  useEffect(() => {
    if (state.step === 'workspace' && state.user != null) {
      navigate('/workspace', { state: { userId: state.user.id, intent: 'signup' } });
    }
  }, [state.step, state.user, navigate]);

  if (!isProvider(provider)) return <Navigate to="/login" replace />;

  return (
    <FlowScreen
      onPrimary={(_fields, container) => {
        const inputs = Array.from(container.querySelectorAll('input'));
        const username = inputs[0]?.value ?? '';
        const displayName = inputs[1]?.value ?? '';
        void signUpReduce(state, {
          kind: 'completeOAuth', provider, username, displayName,
        }).then(setState);
      }}
    >
      <OAuthConfirmPage provider={provider} />
    </FlowScreen>
  );
};
