import { SignupDonePage } from '@open-tomato/ui-components';
import { useLocation } from 'react-router';

import { FlowScreen, goToWebapp } from '../auth';

/**
 * Sign-up complete. The session was already minted at workspace pick and
 * persisted; the CTA just hands back to the webapp (env-driven target).
 */
export const SignupDoneRoute = () => {
  const location = useLocation();
  return (
    <FlowScreen onPrimary={() => goToWebapp(location.search)}>
      <SignupDonePage />
    </FlowScreen>
  );
};
