import type React from 'react';

import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';

import { cn } from '@/particles/cn';

import { toggleSidebarVariants, toggleWrapperVariants } from './ToggleSidebar.variants';
interface ToggleSidebarButtonProps {
  isCompact: boolean;
  onToggleMode: () => void;
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

interface ToggleSidebarProps {
  children: React.ReactNode;
  isCompact: boolean;
}

const sizeMap = {
  sm: '24',
  md: '32',
  lg: '40',
  icon: '18',
};

export const ToggleWrapper = ({ children, isCompact }: ToggleSidebarProps) => (
  <div className={cn(toggleWrapperVariants({ isCompact }))}>
    {children}
  </div>
);

export const ToggleSidebar = ({ isCompact, onToggleMode, size = 'icon' }: ToggleSidebarButtonProps) => (
  <ToggleWrapper isCompact={isCompact}>
    <button
      type="button"
      onClick={onToggleMode}
      aria-label={
        isCompact
          ? 'Expand sidebar'
          : 'Collapse sidebar'
      }
      className={cn(toggleSidebarVariants({ isCompact }) )}
    >
      {isCompact
        ? <PanelLeftOpen size={sizeMap[size]} />
        : <PanelLeftClose size={sizeMap[size]} />}
    </button >
  </ToggleWrapper>

);
