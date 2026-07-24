import type { Tool, ToolEditorOptions, ToolType } from '../../data';

import {
  Button,
  ChipList,
  DecoratedToggle,
  DecoratedToggleList,
  Divider,
  FormField,
  Icon,
  Modal,
  Select,
  Textarea,
  TextInput,
} from '@open-tomato/ui-components';
import { useEffect, useState } from 'react';

import { api } from '../../data';

import { TOOL_TYPE_META } from './toolMeta';
import { ToolTypeSelector, type ToolTypeOption } from './ToolTypeSelector';

const TYPE_DESCRIPTION: Record<ToolType, string> = {
  'api-client': 'Token-authenticated webhook integration. Calls out on system events.',
  'mcp-server': 'Model Context Protocol server. Exposes its tools to every agent.',
  'skill-set': 'A folder or repo of skill prompts the agent can invoke by name.',
};

const TYPE_OPTIONS: ToolTypeOption[] = (
  ['api-client', 'mcp-server', 'skill-set'] as ToolType[]
).map((type) => ({
  value: type,
  label: TOOL_TYPE_META[type].label,
  icon: TOOL_TYPE_META[type].icon,
  tone: TOOL_TYPE_META[type].tone,
  description: TYPE_DESCRIPTION[type],
}));

type AuthScheme = 'none' | 'token' | 'basic' | 'header';

const AUTH_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'token', label: 'Token' },
  { value: 'basic', label: 'Basic' },
  { value: 'header', label: 'Custom headers' },
];

interface HeaderPair { key: string; value: string; }

export type ToolEditorMode = 'new' | 'edit' | 'clone';

export interface ToolEditorModalProps {
  open: boolean;
  onClose: () => void;
  mode?: ToolEditorMode;
  /** The tool being edited/cloned (edit + clone). */
  tool?: Tool;
}

/**
 * ToolEditorModal — the New / Edit / Clone Tool form (spec: the WS04
 * reference ToolEditorModal, UI-Tools.md). A ToolTypeSelector drives a
 * partially dynamic form:
 *
 * - Static segment: type selector, name, description. Edit locks the whole
 *   static segment (read-only); Clone unlocks name + description and
 *   appends `-cloned`.
 * - Dynamic segment (per type): MCP → server URL + JSON-validated
 *   credentials + a recommended auto-start toggle; Skills → source + a
 *   Load-skills gate (Add tool stays disabled until the scan lands a
 *   DecoratedToggleList); API → webhook endpoint + an auth-scheme select
 *   swapping none / Token / Basic / Custom-headers field sets + an events
 *   ChipList.
 *
 * Clone-unlocks-credentials: the token/password fields lock on `edit`
 * (mask the existing secret) but stay editable on `clone` (a NEW tool
 * takes its own credentials) — gated on `staticLocked`, not `editing`.
 *
 * Option pools (system events, loadable skills) come from
 * `api.tools.editorOptions`. Reset-on-open is structural — parents mount
 * this only while open.
 */
export const ToolEditorModal = ({
  open,
  onClose,
  mode = 'new',
  tool,
}: ToolEditorModalProps) => {
  const editing = mode === 'edit' || mode === 'clone';
  const staticLocked = mode === 'edit';

  const [options, setOptions] = useState<ToolEditorOptions | null>(null);
  useEffect(() => {
    let cancelled = false;
    void api.tools.editorOptions()
      .then((opts) => { if (!cancelled) setOptions(opts); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('tool-editor options load failed', error);
      });
    return () => { cancelled = true; };
  }, []);

  const [type, setType] = useState<ToolType>(() => tool?.type ?? 'api-client');
  const [name, setName] = useState(() => {
    if (tool == null) return '';
    return mode === 'clone'
      ? `${tool.name}-cloned`
      : tool.name;
  });
  const [description, setDescription] = useState(() => tool?.description ?? '');

  // MCP
  const [mcpUrl, setMcpUrl] = useState(() => (tool?.type === 'mcp-server'
    ? tool.uri
    : ''));
  const [mcpCredentials, setMcpCredentials] = useState('');
  const [mcpAutoStart, setMcpAutoStart] = useState(true);

  // Skills
  const [skillSource, setSkillSource] = useState(() => (tool?.type === 'skill-set'
    ? tool.uri
    : ''));
  const [skillsLoaded, setSkillsLoaded] = useState(false);
  const [enabledSkills, setEnabledSkills] = useState<string[]>([]);

  // API
  const [apiEndpoint, setApiEndpoint] = useState(() => (tool?.type === 'api-client'
    ? tool.uri
    : ''));
  const [authScheme, setAuthScheme] = useState<AuthScheme>('none');
  const [tokenType, setTokenType] = useState('bearer');
  const [tokenValue, setTokenValue] = useState('');
  const [basicUser, setBasicUser] = useState('');
  const [basicPass, setBasicPass] = useState('');
  const [headers, setHeaders] = useState<HeaderPair[]>([{ key: '', value: '' }]);
  const [events, setEvents] = useState<string[]>(() => (tool?.type === 'api-client'
    ? [...tool.events]
    : []));

  const meta = TOOL_TYPE_META[type];
  const sampleSkills = options?.sampleSkills ?? [];

  const loadSkills = () => {
    if (skillSource.trim() === '') return;
    setSkillsLoaded(true);
    setEnabledSkills(sampleSkills.map((s) => s.id));
  };

  // JSON validation for MCP credentials (optional field — empty is fine).
  const credentialsInvalid = (() => {
    if (type !== 'mcp-server' || mcpCredentials.trim() === '') return false;
    try {
      JSON.parse(mcpCredentials);
      return false;
    } catch {
      return true;
    }
  })();

  const addHeaderEnabled = headers.every((h) => h.key.trim() !== '' && h.value.trim() !== '');
  const updateHeader = (i: number, patch: Partial<HeaderPair>) => setHeaders((prev) => prev.map((h, idx) => (idx === i
    ? { ...h, ...patch }
    : h)));

  const nameMissing = name.trim() === '';
  // Skills require a completed load before the tool can be created (spec).
  const skillsGate = type === 'skill-set' && !skillsLoaded;
  const invalid = nameMissing || credentialsInvalid || skillsGate;

  const footerStatus = skillsGate
    ? 'load skills to continue'
    : credentialsInvalid
      ? 'credentials must be valid JSON'
      : meta.label;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={mode === 'edit'
        ? 'Edit tool'
        : mode === 'clone'
          ? 'Clone tool'
          : 'New tool'}
      title={editing && tool != null
        ? name || tool.name
        : 'Wire up something for your agents to call'}
      footerStatus={footerStatus}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            iconLeading={<Icon name="check" size={15} />}
            disabled={invalid}
            onClick={onClose}
          >
            {mode === 'edit'
              ? 'Save changes'
              : mode === 'clone'
                ? 'Create clone'
                : 'Add tool'}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        {/* static segment */}
        <FormField label="Tool type" hint="Which type of tool are we defining below.">
          <ToolTypeSelector
            options={TYPE_OPTIONS}
            value={type}
            onChange={(v) => setType(v as ToolType)}
            disabled={staticLocked}
          />
        </FormField>

        <FormField label="Name" required>
          <TextInput
            value={name}
            onChange={setName}
            invalid={nameMissing}
            disabled={staticLocked}
            placeholder={type === 'api-client'
              ? 'linear'
              : type === 'mcp-server'
                ? 'github-issues'
                : 'tomato-skills'}
          />
        </FormField>

        <FormField label="Description" hint="One sentence. Shown next to the tool name everywhere.">
          <Textarea
            value={description}
            onChange={setDescription}
            disabled={staticLocked}
            rows={2}
            placeholder="What does this tool let an agent do?"
          />
        </FormField>

        <Divider label={`${meta.label} settings`} />

        {/* dynamic segment */}
        {type === 'mcp-server' && (
          <>
            <FormField label="Server URL" hint="stdio:// or http(s):// addressable from the dashboard host.">
              <TextInput
                value={mcpUrl}
                onChange={setMcpUrl}
                placeholder="stdio://mcp-github"
                prefix={<Icon name="server" size={14} />}
              />
            </FormField>
            <FormField
              label="Credentials"
              error={credentialsInvalid
                ? 'Must be a valid JSON blob.'
                : undefined}
              hint={!credentialsInvalid
                ? 'Optional — JSON blob or env-var name. Stored encrypted.'
                : undefined}
            >
              <Textarea
                value={mcpCredentials}
                onChange={setMcpCredentials}
                invalid={credentialsInvalid}
                rows={3}
                placeholder='{"GITHUB_TOKEN": "$GH_PAT"}'
                className="font-mono text-xs"
              />
            </FormField>
            <DecoratedToggle
              decoration={<Icon name="power" size={15} />}
              title="Auto-start"
              description="Connect to the MCP server when this workspace boots up."
              meta={(
                <span className="rounded-full bg-surface-sunk px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.06em] text-fg3">
                  recommended
                </span>
              )}
              checked={mcpAutoStart}
              onChange={setMcpAutoStart}
            />
          </>
        )}

        {type === 'skill-set' && (
          <>
            <FormField label="Source" hint="A local folder or a GitHub repo URL.">
              <div className="flex gap-2">
                <TextInput
                  value={skillSource}
                  onChange={(v) => {
                    setSkillSource(v);
                    // Changing the source invalidates a prior load.
                    setSkillsLoaded(false);
                    setEnabledSkills([]);
                  }}
                  placeholder="github.com/open-tomato/skills"
                  prefix={<Icon name="folder" size={14} />}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  iconLeading={<Icon name="download" size={15} />}
                  onClick={loadSkills}
                  disabled={skillSource.trim() === ''}
                >
                  {skillsLoaded
                    ? 'Rescan'
                    : 'Load skills'}
                </Button>
              </div>
            </FormField>
            {skillsLoaded && (
              <DecoratedToggleList
                title={`found ${sampleSkills.length} skills`}
                value={enabledSkills}
                onChange={setEnabledSkills}
                options={sampleSkills.map((s) => ({
                  id: s.id,
                  title: s.name,
                  description: s.description,
                  decoration: <Icon name="drafting-compass" size={15} />,
                }))}
              />
            )}
          </>
        )}

        {type === 'api-client' && (
          <>
            <FormField label="Webhook endpoint" hint="The URL we POST to on the events you pick below.">
              <TextInput
                value={apiEndpoint}
                onChange={setApiEndpoint}
                placeholder="https://hooks.slack.com/services/T0…/B0…"
                prefix={<Icon name="webhook" size={14} />}
              />
            </FormField>

            <FormField label="Auth scheme">
              <Select
                value={authScheme}
                onChange={(v) => setAuthScheme(v as AuthScheme)}
                width={200}
                ariaLabel="Auth scheme"
                options={AUTH_OPTIONS}
              />
            </FormField>

            {authScheme === 'token' && (
              <div className="grid grid-cols-[160px_1fr] gap-3 max-md:grid-cols-1">
                <FormField label="Token type">
                  <TextInput value={tokenType} onChange={setTokenType} placeholder="bearer" />
                </FormField>
                <FormField label="Token" hint="Stored encrypted. Never shown after save.">
                  <TextInput
                    value={tokenValue}
                    onChange={setTokenValue}
                    type="password"
                    // Edit masks the existing secret; Clone is a NEW tool and
                    // takes its own credentials — gate on staticLocked.
                    disabled={staticLocked}
                    placeholder={staticLocked
                      ? 'lin_api_••••••••••••'
                      : 'paste the token'}
                    prefix={<Icon name="key" size={14} />}
                  />
                </FormField>
              </div>
            )}

            {authScheme === 'basic' && (
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                <FormField label="Username">
                  <TextInput value={basicUser} onChange={setBasicUser} placeholder="api-user" />
                </FormField>
                <FormField label="Password" hint="Stored encrypted.">
                  <TextInput
                    value={basicPass}
                    onChange={setBasicPass}
                    type="password"
                    disabled={staticLocked}
                    placeholder="••••••••"
                    prefix={<Icon name="key" size={14} />}
                  />
                </FormField>
              </div>
            )}

            {authScheme === 'header' && (
              <FormField label="Custom headers" hint="Header key / value pairs sent with every call.">
                <div className="flex flex-col gap-2">
                  {headers.map((header, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <TextInput
                        value={header.key}
                        onChange={(v) => updateHeader(i, { key: v })}
                        placeholder="X-Api-Key"
                        aria-label={`Header ${i + 1} key`}
                      />
                      <TextInput
                        value={header.value}
                        onChange={(v) => updateHeader(i, { value: v })}
                        placeholder="value"
                        aria-label={`Header ${i + 1} value`}
                      />
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    iconLeading={<Icon name="plus" size={14} />}
                    disabled={!addHeaderEnabled}
                    onClick={() => setHeaders((prev) => [...prev, { key: '', value: '' }])}
                    className="self-start"
                  >
                    Add header
                  </Button>
                </div>
              </FormField>
            )}

            <FormField label="Call webhook on" hint="Which system events should fire this tool?">
              <ChipList
                mode="multi"
                allowNew
                options={(options?.systemEvents ?? []).map((e) => ({ value: e.value, label: e.label }))}
                value={events}
                onChange={setEvents}
                placeholder="Add events…"
                ariaLabel="Call webhook on"
              />
            </FormField>
          </>
        )}
      </div>
    </Modal>
  );
};

ToolEditorModal.displayName = 'ToolEditorModal';
