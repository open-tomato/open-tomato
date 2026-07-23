import type { SidebarNavConfigItem } from '@open-tomato/ui-components';

/**
 * Sidebar navigation as data (app-shell spec: "dynamically generated
 * from json/api/yaml"), extended with the URL segment each entry owns —
 * note the Roadmap nav entry lives at the `/tasks` path (UI-Roadmap
 * spec) while keeping its own label and icon.
 */
export interface AppNavItem extends SidebarNavConfigItem {
  /** First path segment under the workspace base ('' = overview). */
  segment: string;
}

export const NAV_ITEMS: AppNavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'layout-dashboard', segment: '' },
  { id: 'sessions', label: 'Sessions', icon: 'terminal', segment: 'sessions' },
  { id: 'agents', label: 'Agents', icon: 'bot', segment: 'agents' },
  { id: 'roadmap', label: 'Roadmap', icon: 'list', segment: 'tasks' },
  { id: 'tools', label: 'Tools', icon: 'cpu', segment: 'tools' },
];

/** Placeholder until WS11 gives the docs site its real home. */
export const DOCS_URL = 'https://docs.open-tomato.dev';

/** Topbar page title per first path segment under the base. */
const SEGMENT_TITLES: Record<string, string> = {
  '': 'Overview',
  sessions: 'Sessions',
  agents: 'Agents',
  tasks: 'Roadmap',
  tools: 'Tools',
  settings: 'Settings',
  notifications: 'Notifications',
  search: 'Search results',
};

export const titleForSegment = (segment: string): string => SEGMENT_TITLES[segment] ?? 'Open Tomato';

export const navIdForSegment = (segment: string): string | undefined => NAV_ITEMS.find((item) => item.segment === segment)?.id;
