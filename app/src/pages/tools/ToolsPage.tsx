import type { Tool, ToolType } from '../../data';

import {
  Button,
  Icon,
  SearchInput,
  Toast,
  Toolbar,
  ToolbarControls,
} from '@open-tomato/ui-components';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router';

import { api, DEFAULT_WORKSPACE_ID, POC_NOW } from '../../data';
import { withBase, workspaceBase } from '../../routes/paths';
import { FilterBadge } from '../shared/FilterBadge';
import { PageHead } from '../shared/PageHead';

import { ToolCard, type ToolCardStatus } from './ToolCard';
import { countUnitFor, TOOL_TYPE_META } from './toolMeta';
import { ToolsSkeleton } from './ToolsSkeleton';

type TypeFilter = 'all' | ToolType;

const FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'all' },
  { id: 'api-client', label: 'API Client' },
  { id: 'mcp-server', label: 'MCP Server' },
  { id: 'skill-set', label: 'Skills' },
];

/** Test Connection settle delay — long enough to see the connecting pulse. */
const TEST_CONNECTION_MS = 900;

/**
 * ToolsPage (`/tools`) — WS07 session 3. Spec: the WS04 reference
 * ToolsPage (UI-Tools.md), rebuilt as app code over `api.tools.list`.
 *
 * Type FilterBadges (with a leading type glyph + count) on a detached
 * toolbar, then a responsive ToolCard grid. Test Connection (spec
 * "Behavior"): the card menu's Test Connection flips the card badge to the
 * connecting pulse, then settles back to the tool's real status; a failure
 * raises a PERSISTENT toast (no auto-dismiss). New / Edit / Clone open the
 * ToolEditorModal via the sub-routes rendered into the `<Outlet/>`. All
 * mutating handlers are PoC mocks. ToolCard + ToolTypeSelector are
 * app-local catalog-gap rebuilds (flagged for promotion).
 */
export const ToolsPage = () => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const navigate = useNavigate();
  const base = workspaceBase(workspaceId);
  const activeWorkspaceId = workspaceId ?? DEFAULT_WORKSPACE_ID;

  const [tools, setTools] = useState<Tool[] | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TypeFilter>('all');
  // Ids currently mid-Test-Connection (override the resting status badge).
  const [connecting, setConnecting] = useState<string[]>([]);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  // Pending Test-Connection timers, cleared on unmount.
  const timers = useRef<number[]>([]);
  useEffect(() => () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api.tools.list(activeWorkspaceId)
      .then((rows) => { if (!cancelled) setTools(rows); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('tools load failed', error);
      });
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  const goTo = (relative: string): void => {
    void navigate(withBase(base, relative));
  };

  const rows = useMemo(() => tools ?? [], [tools]);

  const counts = useMemo(() => ({
    all: rows.length,
    'api-client': rows.filter((t) => t.type === 'api-client').length,
    'mcp-server': rows.filter((t) => t.type === 'mcp-server').length,
    'skill-set': rows.filter((t) => t.type === 'skill-set').length,
  }), [rows]);

  const filtered = useMemo(
    () => rows
      .filter((tool) => filter === 'all' || tool.type === filter)
      .filter((tool) => {
        if (query === '') return true;
        const haystack = `${tool.name} ${tool.description} ${tool.uri}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [rows, filter, query],
  );

  const testConnection = (tool: Tool) => {
    // Ignore a repeat click while this tool is already connecting.
    if (connecting.includes(tool.id)) return;
    setConnecting((prev) => [...prev, tool.id]);
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      setConnecting((prev) => prev.filter((cid) => cid !== tool.id));
      if (tool.status === 'needs-attention') {
        setErrorToast(`Couldn't reach ${tool.name} at ${tool.uri} — TLS handshake failed.`);
      }
    }, TEST_CONNECTION_MS);
    timers.current.push(id);
  };

  const statusFor = (tool: Tool): ToolCardStatus => (connecting.includes(tool.id)
    ? 'connecting'
    : tool.status);

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Tools"
        tags={['connected surfaces', 'API, MCP, skills']}
        sub="What your agents can touch. API clients, MCP servers, and skill libraries."
        action={(
          <Button
            variant="primary"
            iconLeading={<Icon name="plus" size={16} />}
            onClick={() => goTo('/tools/new')}
          >
            New tool
          </Button>
        )}
      />

      {tools == null
        ? <ToolsSkeleton />
        : (
          <>
            <Toolbar>
              <ToolbarControls>
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Filter tools…"
                  aria-label="Filter tools"
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
                      decoration={f.id !== 'all'
                        ? <Icon name={TOOL_TYPE_META[f.id].icon} size={13} />
                        : undefined}
                    />
                  ))}
                </div>
              </ToolbarControls>
            </Toolbar>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3.5">
              {filtered.map((tool) => {
                const meta = TOOL_TYPE_META[tool.type];
                return (
                  <ToolCard
                    key={tool.id}
                    id={tool.id}
                    name={tool.name}
                    description={tool.description}
                    uri={tool.uri}
                    typeLabel={meta.short}
                    typeIcon={meta.icon}
                    typeTone={meta.tone}
                    typeBadgeTone={meta.badgeTone}
                    status={statusFor(tool)}
                    inUse={tool.inUse}
                    count={tool.itemCount}
                    countUnit={countUnitFor(tool.type)}
                    webhookEvents={tool.type === 'api-client'
                      ? tool.events
                      : undefined}
                    lastUsedAt={tool.lastUsedAt ?? null}
                    now={POC_NOW}
                    onEdit={() => goTo(`/tools/${tool.id}/edit`)}
                    onDuplicate={() => goTo(`/tools/${tool.id}/clone`)}
                    onTest={() => testConnection(tool)}
                  />
                );
              })}
            </div>
          </>
        )}

      {/* persistent error toast (spec: no auto-dismiss) */}
      {errorToast != null && (
        <div className="fixed bottom-5 right-5 z-50 max-w-[360px]">
          <Toast tone="danger" floating onClose={() => setErrorToast(null)}>
            {errorToast}
          </Toast>
        </div>
      )}

      {/* new / edit / clone sub-routes render the editor modal here */}
      <Outlet />
    </div>
  );
};

ToolsPage.displayName = 'ToolsPage';
