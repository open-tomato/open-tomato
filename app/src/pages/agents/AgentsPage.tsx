import type { Agent, Tool } from '../../data';

import {
  Button,
  Icon,
  SearchInput,
  Toolbar,
  ToolbarControls,
} from '@open-tomato/ui-components';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router';

import { api, DEFAULT_WORKSPACE_ID, POC_NOW } from '../../data';
import { withBase, workspaceBase } from '../../routes/paths';
import { FilterBadge } from '../shared/FilterBadge';
import { PageHead } from '../shared/PageHead';

import { AgentCard } from './AgentCard';
import { AgentsSkeleton } from './AgentsSkeleton';

type AgentFilter = 'all' | 'enabled' | 'in-use' | 'disabled';

const FILTERS: { id: AgentFilter; label: string }[] = [
  { id: 'all', label: 'all' },
  { id: 'enabled', label: 'enabled' },
  { id: 'in-use', label: 'in use' },
  { id: 'disabled', label: 'disabled' },
];

const matchesFilter = (agent: Agent, filter: AgentFilter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'enabled') return agent.status === 'enabled';
  if (filter === 'disabled') return agent.status === 'disabled';
  return agent.runningCount > 0;
};

interface AgentsData {
  agents: Agent[];
  tools: Tool[];
}

/**
 * AgentsPage — the Agents grid (WS07 session 2). Spec: UI-Agents.md;
 * composition mirrors the WS04 reference AgentsPage, rebuilt as app code
 * over `api.agents.list` (+ `api.tools.list` to resolve the tool badges).
 *
 * GRID ONLY (spec drops the raw grid/list toggle): a search filter + filter
 * badges on a detached toolbar, then a responsive AgentCard grid. New /
 * Edit / Clone open the AgentEditorModal via the sub-routes rendered into
 * the `<Outlet/>` below (`/agents/new`, `/agents/:id/edit`,
 * `/agents/:id/clone`). AgentCard is an app-local catalog-gap component
 * (see ./AgentCard). All mutating handlers are PoC mocks.
 */
export const AgentsPage = () => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const navigate = useNavigate();
  const base = workspaceBase(workspaceId);
  const activeWorkspaceId = workspaceId ?? DEFAULT_WORKSPACE_ID;

  const [data, setData] = useState<AgentsData | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AgentFilter>('all');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.agents.list(activeWorkspaceId),
      api.tools.list(activeWorkspaceId),
    ])
      .then(([agents, tools]) => { if (!cancelled) setData({ agents, tools }); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('agents load failed', error);
      });
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  const goTo = (relative: string): void => {
    void navigate(withBase(base, relative));
  };

  const agents = useMemo(() => data?.agents ?? [], [data]);
  const tools = useMemo(() => data?.tools ?? [], [data]);

  const toolLabel = useMemo(() => {
    const map = new Map(tools.map((t) => [t.id, t.name]));
    return (id: string): string => map.get(id) ?? id.replace(/^tol-/, '');
  }, [tools]);

  const counts = useMemo(() => ({
    all: agents.length,
    enabled: agents.filter((a) => a.status === 'enabled').length,
    'in-use': agents.filter((a) => a.runningCount > 0).length,
    disabled: agents.filter((a) => a.status === 'disabled').length,
  }), [agents]);

  const filtered = useMemo(
    () => agents
      .filter((agent) => matchesFilter(agent, filter))
      .filter((agent) => {
        if (query === '') return true;
        const haystack = `${agent.name} ${agent.model} ${agent.toolIds.map(toolLabel).join(' ')}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [agents, filter, query, toolLabel],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Agents"
        tags={['reusable personas', 'model + tool surface']}
        sub="Personas your team can spawn sessions from."
        action={(
          <Button
            variant="primary"
            iconLeading={<Icon name="plus" size={16} />}
            onClick={() => goTo('/agents/new')}
          >
            New agent
          </Button>
        )}
      />

      {data == null
        ? <AgentsSkeleton />
        : (
          <>
            <Toolbar>
              <ToolbarControls>
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Filter by agent, model or tool…"
                  aria-label="Filter agents"
                  className="max-w-[280px]"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {FILTERS.map((f) => (
                    <FilterBadge
                      key={f.id}
                      selected={filter === f.id}
                      onClick={() => setFilter(f.id)}
                      label={f.label}
                      count={counts[f.id]}
                    />
                  ))}
                </div>
              </ToolbarControls>
            </Toolbar>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
              {filtered.map((agent) => (
                <AgentCard
                  key={agent.id}
                  id={agent.id}
                  name={agent.name}
                  description={agent.description}
                  model={agent.model}
                  tools={agent.toolIds.map(toolLabel)}
                  enabled={agent.status === 'enabled'}
                  running={agent.runningCount}
                  lastRunAt={agent.lastRunAt ?? null}
                  runs={agent.totalRuns}
                  now={POC_NOW}
                  onRun={() => goTo('/sessions/new')}
                  onEdit={() => goTo(`/agents/${agent.id}/edit`)}
                  onDuplicate={() => goTo(`/agents/${agent.id}/clone`)}
                />
              ))}
            </div>
          </>
        )}

      {/* new / edit / clone sub-routes render the editor modal here */}
      <Outlet />
    </div>
  );
};

AgentsPage.displayName = 'AgentsPage';
