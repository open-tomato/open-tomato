
import { useSidebar } from '@/templates/Sidebar';

import { Brand } from '../../components/Brand';
/**
 * Composite header slot for the demo. Renders the brand mark + wordmark,
 * and (when the rail is `expanded`) a workspace switcher tile. Branches
 * on `mode` via `useSidebar` so the brand row centers + workspace switcher
 * hides in the rail / hidden modes.
 */
export function SidebarHeader() {
  const { mode } = useSidebar();
  const isCompact = mode === 'rail' || mode === 'hidden';

  return (
    <>
      <Brand isCompact={isCompact} />
    </>
  );
}
