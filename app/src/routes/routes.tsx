import type { RouteObject } from 'react-router';

import { AppLayout } from '../app-shell/AppLayout';
import { OverviewPage } from '../pages/overview';

import { PlaceholderPage } from './PlaceholderPage';

/**
 * Route table (session 0) — URL patterns from the UI-*.md specs:
 *
 *   /                                  Overview (single-workspace base)
 *   /workspace/:workspaceId            Overview (multi-workspace base)
 *   …/sessions                         Sessions list
 *   …/sessions/new                     New Session modal route
 *   …/sessions/:sessionId              View Session
 *   …/sessions/:sessionId/fork         Fork Session
 *   …/sessions/:sessionId/export       Export transcript
 *   …/agents(/new|/:agentId(/edit|/clone|/export))
 *   …/tasks(/new|/:taskId(/edit|/clone|/export))     ← "Roadmap" page
 *   …/tools(/new|/:toolId(/edit|/clone|/export))
 *   …/settings/*                       Settings shell (vertical sub-nav later)
 *   …/notifications                    Notifications page
 *   …/search?q=…                       Search results (⌘K enter-fallthrough)
 */

interface EntityRouteSpec {
  segment: string;
  /** List page title ("Sessions", "Roadmap"). */
  title: string;
  /** Singular entity name for sub-page titles ("Session"). */
  singular: string;
  /** Route param name (":sessionId"). */
  param: string;
  /** Detail sub-actions ("fork" | "edit" | "clone" | "export"). */
  subActions: string[];
}

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

const entityRoutes = ({
  segment,
  title,
  singular,
  param,
  subActions,
}: EntityRouteSpec): RouteObject => ({
  path: segment,
  children: [
    { index: true, element: <PlaceholderPage title={title} /> },
    { path: 'new', element: <PlaceholderPage title={`New ${singular}`} /> },
    {
      path: `:${param}`,
      children: [
        { index: true, element: <PlaceholderPage title={singular} /> },
        ...subActions.map((action): RouteObject => ({
          path: action,
          element: (
            <PlaceholderPage title={`${capitalize(action)} ${singular}`} />
          ),
        })),
      ],
    },
  ],
});

const workspaceChildren = (): RouteObject[] => [
  { index: true, element: <OverviewPage /> },
  entityRoutes({
    segment: 'sessions',
    title: 'Sessions',
    singular: 'Session',
    param: 'sessionId',
    subActions: ['fork', 'export'],
  }),
  entityRoutes({
    segment: 'agents',
    title: 'Agents',
    singular: 'Agent',
    param: 'agentId',
    subActions: ['edit', 'clone', 'export'],
  }),
  entityRoutes({
    segment: 'tasks',
    title: 'Roadmap',
    singular: 'Task',
    param: 'taskId',
    subActions: ['edit', 'clone', 'export'],
  }),
  entityRoutes({
    segment: 'tools',
    title: 'Tools',
    singular: 'Tool',
    param: 'toolId',
    subActions: ['edit', 'clone', 'export'],
  }),
  {
    path: 'settings',
    children: [
      { index: true, element: <PlaceholderPage title="Settings" /> },
      { path: '*', element: <PlaceholderPage title="Settings" /> },
    ],
  },
  { path: 'notifications', element: <PlaceholderPage title="Notifications" /> },
  { path: 'search', element: <PlaceholderPage title="Search results" /> },
  { path: '*', element: <PlaceholderPage title="Not found" /> },
];

export const appRoutes: RouteObject[] = [
  { path: '/', element: <AppLayout />, children: workspaceChildren() },
  {
    path: '/workspace/:workspaceId',
    element: <AppLayout />,
    children: workspaceChildren(),
  },
];
