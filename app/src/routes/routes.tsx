import type { RouteObject } from 'react-router';

import { AppLayout } from '../app-shell/AppLayout';
import {
  AgentCloneRoute,
  AgentEditRoute,
  AgentNewRoute,
  AgentsPage,
} from '../pages/agents';
import { NotificationsPage } from '../pages/notifications';
import { OverviewPage } from '../pages/overview';
import {
  RoadmapPage,
  TaskEditRoute,
  TaskNewRoute,
} from '../pages/roadmap';
import { SearchResultsPage } from '../pages/search';
import {
  ExportTranscriptRoute,
  ForkSessionRoute,
  NewSessionRoute,
  SessionsPage,
  SessionViewPage,
} from '../pages/sessions';
import { SettingsPage } from '../pages/settings';
import {
  ToolCloneRoute,
  ToolEditRoute,
  ToolNewRoute,
  ToolsPage,
} from '../pages/tools';

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
 *   …/agents(/new|/:agentId(/edit|/clone))
 *   …/tasks(/new|/:taskId/edit)        ← "Roadmap" page (form modals)
 *   …/tools(/new|/:toolId(/edit|/clone))
 *   …/settings(/:section)              Settings shell (URL-driven sub-nav)
 *   …/notifications                    Notifications page
 *   …/search?q=…                       Search results (⌘K enter-fallthrough)
 */

const workspaceChildren = (): RouteObject[] => [
  { index: true, element: <OverviewPage /> },
  // Sessions: the list is the layout for the New/Fork/Export modal
  // sub-routes (rendered into its Outlet); the View page is a sibling full
  // page so it fully replaces the list.
  {
    path: 'sessions',
    element: <SessionsPage />,
    children: [
      { path: 'new', element: <NewSessionRoute /> },
      { path: ':sessionId/fork', element: <ForkSessionRoute /> },
      { path: ':sessionId/export', element: <ExportTranscriptRoute /> },
    ],
  },
  { path: 'sessions/:sessionId', element: <SessionViewPage /> },
  // Agents: grid-only (spec) — the grid is the layout for the
  // New/Edit/Clone editor modal sub-routes.
  {
    path: 'agents',
    element: <AgentsPage />,
    children: [
      { path: 'new', element: <AgentNewRoute /> },
      { path: ':agentId/edit', element: <AgentEditRoute /> },
      { path: ':agentId/clone', element: <AgentCloneRoute /> },
    ],
  },
  // Roadmap: the table is the layout for the New/Edit task-form modal
  // sub-routes (rendered into its Outlet). Edit opens from a row menu.
  {
    path: 'tasks',
    element: <RoadmapPage />,
    children: [
      { path: 'new', element: <TaskNewRoute /> },
      { path: ':taskId/edit', element: <TaskEditRoute /> },
    ],
  },
  // Tools: grid is the layout for the New/Edit/Clone editor modal sub-routes.
  {
    path: 'tools',
    element: <ToolsPage />,
    children: [
      { path: 'new', element: <ToolNewRoute /> },
      { path: ':toolId/edit', element: <ToolEditRoute /> },
      { path: ':toolId/clone', element: <ToolCloneRoute /> },
    ],
  },
  // Settings: shell with a URL-driven vertical sub-nav (the splat selects
  // the section; the same page renders for `/settings` and `/settings/:s`).
  { path: 'settings', element: <SettingsPage /> },
  { path: 'settings/*', element: <SettingsPage /> },
  { path: 'notifications', element: <NotificationsPage /> },
  { path: 'search', element: <SearchResultsPage /> },
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
