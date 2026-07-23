import { AuthShell, PasskeyPrompt, TwoFactorPage } from '@open-tomato/ui-components';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

import {
  FlowScreen,
  QrCode,
  authApi,
  enrollReduce,
  goToWebapp,
  initialEnroll,
  isWebAuthnSupported,
  registerPasskey,
  type EnrollEvent,
  type EnrollState,
} from '../auth';

import { AuthBanner } from './shared/AuthBanner';

/**
 * Two-factor ENROLLMENT: method pick → (TOTP) scan → confirm → done, or
 * (Passkey) the WebAuthn registration ceremony via `PasskeyPrompt`. The prompt
 * is the waiting state shown while the BROWSER runs `navigator.credentials
 * .create` (D5); backend verification is mocked.
 */
export const EnrollFlow = () => {
  const location = useLocation();
  const [state, setState] = useState<EnrollState>(initialEnroll);
  const passkeyStarted = useRef(false);

  // Each render's handler closes over the current `state`; one click drives one
  // async transition through the machine, then re-renders.
  const dispatch = (event: EnrollEvent) => void enrollReduce(state, event).then(setState);

  useEffect(() => {
    if (state.step !== 'passkey') {
      passkeyStarted.current = false;
      return;
    }
    if (passkeyStarted.current) return;
    passkeyStarted.current = true;

    // Drive the browser WebAuthn ceremony, then hand the credential to the mock
    // (the finish transition itself is unit-tested via enrollReduce). Functional
    // setState keeps the machine state out of the effect deps.
    void (async () => {
      if (!isWebAuthnSupported()) {
        setState((s) => ({ ...s, error: 'Passkeys aren\'t available in this browser. Use an authenticator app instead.' }));
        return;
      }
      const options = await authApi.twoFactor.enrollPasskeyStart();
      const result = await registerPasskey(options);
      if (result.status !== 'created') {
        setState((s) => ({ ...s, error: 'The passkey prompt was dismissed. Try again or pick another method.' }));
        return;
      }
      const finish = await authApi.twoFactor.enrollPasskeyFinish(result.credential);
      if (finish.status === 'failed') {
        setState((s) => ({ ...s, error: finish.reason }));
        return;
      }
      setState((s) => ({
        ...s, step: 'done', recoveryCodes: finish.recoveryCodes, error: undefined,
      }));
    })();
  }, [state.step]);

  if (state.step === 'passkey') {
    return (
      <>
        {state.error != null && <AuthBanner message={state.error} />}
        <AuthShell eyebrow="security · two-factor" width="xl">
          <PasskeyPrompt onCancel={() => dispatch({ kind: 'cancelPasskey' })} />
        </AuthShell>
      </>
    );
  }

  if (state.step === 'scan') {
    return (
      <FlowScreen onPrimary={() => dispatch({ kind: 'scanned' })}>
        <TwoFactorPage
          step="scan"
          qr={<QrCode value={state.enrollment?.otpauthUri ?? ''} />}
        />
      </FlowScreen>
    );
  }

  if (state.step === 'confirm') {
    return (
      <FlowScreen onPrimary={(f) => dispatch({ kind: 'submitCode', code: f.code ?? '' })}>
        {state.error != null && <AuthBanner message={state.error} />}
        <TwoFactorPage step="confirm" />
      </FlowScreen>
    );
  }

  if (state.step === 'done') {
    return (
      <FlowScreen onPrimary={() => goToWebapp(location.search)}>
        <TwoFactorPage step="done" />
      </FlowScreen>
    );
  }

  // pick (default) — read the chosen method off the pressed OptionCard, then
  // set it and continue in one gesture.
  return (
    <FlowScreen
      onPrimary={(_f, container) => {
        const pressed = container.querySelector('button[aria-pressed="true"]');
        const method = /passkey/i.test(pressed?.textContent ?? '')
          ? 'passkey'
          : 'totp';
        void enrollReduce(state, { kind: 'pickMethod', method })
          .then((s) => enrollReduce(s, { kind: 'continue' }))
          .then(setState);
      }}
    >
      <TwoFactorPage step="pick" />
    </FlowScreen>
  );
};
