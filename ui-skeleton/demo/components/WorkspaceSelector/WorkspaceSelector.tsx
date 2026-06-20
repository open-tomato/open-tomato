
import { Avatar } from '@/atoms/Avatar';
import { cn } from '@/particles/cn';

import { Icon } from '../../assets/mock-primitives';

import { workspaceButtonAsSelectorVariants, workspaceSelectorVariants } from './WorkspaceSelector.variants';
interface WorkspaceSelectorProps {
  isCompact: boolean;
}

function WorkspaceSelector({ isCompact }: WorkspaceSelectorProps) {
  return (
    !isCompact ?
      <div className={cn(workspaceSelectorVariants({ isCompact }))}>
        <button 
          className={cn(workspaceButtonAsSelectorVariants({ isCompact }))}>
          {/* this should be an avatar or icon-badge for the workspace */}
          <Avatar fallback="OG" shape="square" size="sm"/>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* move this to a typography component */}
            <div style={{
              fontWeight: 600,
              fontSize: 13,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>open-garden</div>
            <div style={{
              color: 'var(--fg3)',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
            }}>workspace</div>
          </div>
          <Icon name="chevronDown" size={14} style={{ color: 'var(--fg3)' }} />
        </button>
      </div>
      : null
  );
}

export { WorkspaceSelector };
