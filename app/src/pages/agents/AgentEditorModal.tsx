import type {
  Agent,
  AgentEditorOptions,
  AgentModelDef,
  AgentToolGroup,
} from '../../data';
import type {
  AvatarSelectorTone,
  IconName,
  VerboseOptionData,
} from '@open-tomato/ui-components';

import {
  AvatarSelector,
  Badge,
  Button,
  DecoratedToggleList,
  Droppable,
  FormField,
  Icon,
  Modal,
  Slider,
  Textarea,
  TextInput,
  VerboseOptionList,
} from '@open-tomato/ui-components';
import { useEffect, useMemo, useState } from 'react';

import { api } from '../../data';
import { formatCompact } from '../../lib';

export type AgentEditorMode = 'new' | 'edit' | 'clone';

/* Token budget — the slider spans 10 steps up to a ~$15 ceiling (spec:
 * "Maximum of 10~20usd"), the token count scaling with the model's rate. */
const BUDGET_MAX_USD = 15;
const BUDGET_STEPS = 10;

/** Preferred initial tool selection where the model unlocks the code cap. */
const PREFERRED_TOOL_DEFAULTS = ['fs', 'shell', 'git', 'tests'];

/** Editor avatar tones (a subset of the AvatarSelector palette). */
const AGENT_AVATAR_TONE: Record<string, AvatarSelectorTone> = {
  'agt-planner': 'primary',
  'agt-frontend': 'accent',
  'agt-debugger': 'gold',
  'agt-docs': 'green',
};

export interface AgentEditorModalProps {
  open: boolean;
  onClose: () => void;
  mode?: AgentEditorMode;
  /** The persona being edited/cloned (edit + clone). */
  agent?: Agent;
}

/**
 * AgentEditorModal — the New / Edit / Clone Agent form (WS07 session 2).
 * Spec: UI-Agents.md "Sub Page: New/Edit/Clone Agent"; rebuilt as app code
 * over `api.agents.editorOptions()` (model catalog + grouped tool surface).
 *
 * Composes AvatarSelector + name/description, a required seed-context
 * Droppable, the VerboseOptionList model pick (changing the model prunes
 * tools it no longer allows), a token-budget Slider ($15 cap), and one
 * DecoratedToggleList per capability group the model unlocks. Clone appends
 * `-cloned` to the name. All handlers are PoC mocks; reset-on-open is
 * structural (parents mount this only while open).
 *
 * Divergence: the editor's capability tools (fs / shell / git / …) are a
 * distinct surface from the persona's workspace tool ids
 * (`agent.toolIds`, MCP servers / API clients rendered on the card).
 * Edit/clone prefill the capability tools with the model's code defaults —
 * the backend contract would unify the two surfaces later.
 */
export const AgentEditorModal = ({ open, onClose, mode = 'new', agent }: AgentEditorModalProps) => {
  const editing = (mode === 'edit' || mode === 'clone') && agent != null;
  const [options, setOptions] = useState<AgentEditorOptions | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.agents.editorOptions()
      .then((opts) => { if (!cancelled) setOptions(opts); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('agent editor options load failed', error);
      });
    return () => { cancelled = true; };
  }, []);

  const [name, setName] = useState(() => {
    if (!editing) return '';
    return mode === 'clone'
      ? `${agent.name}-cloned`
      : agent.name;
  });
  const [description, setDescription] = useState(() => (editing
    ? agent.description
    : ''));
  const [initials, setInitials] = useState(() => (editing
    ? (agent.name[0] ?? 'A').toUpperCase()
    : 'A'));
  const [tone, setTone] = useState<AvatarSelectorTone>(() => (editing
    ? AGENT_AVATAR_TONE[agent.id] ?? 'primary'
    : 'primary'));
  const [model, setModel] = useState(() => (editing
    ? agent.model
    : 'sonnet-4-5'));
  // Null = the selection is still the model's derived default; a non-null
  // value is the user's explicit pick. The effective `tools` below is
  // always reconciled to the active model's allowed set (no raw seed a
  // later effect has to correct — same shape as NewSessionModal's runner).
  const [toolsOverride, setToolsOverride] = useState<string[] | null>(null);
  const [budgetStep, setBudgetStep] = useState(5);
  // Seed context is required. Edit/clone start with the persona's context
  // file; new starts empty and must receive at least one file.
  const [contextFiles, setContextFiles] = useState<string[]>(() => (editing
    ? [`${agent.name}.context.md`]
    : []));

  const models = useMemo(() => options?.models ?? [], [options]);
  const toolGroups = useMemo(() => options?.toolGroups ?? [], [options]);

  const getModel = useMemo(
    () => (id: string): AgentModelDef | undefined => models.find((m) => m.id === id),
    [models],
  );

  const groupsForModel = useMemo(
    () => (modelId: string): AgentToolGroup[] => {
      const caps = getModel(modelId)?.caps ?? [];
      return caps
        .map((cap) => toolGroups.find((g) => g.cap === cap))
        .filter((g): g is AgentToolGroup => g != null);
    },
    [getModel, toolGroups],
  );

  const allowedToolIds = (modelId: string): Set<string> => new Set(groupsForModel(modelId).flatMap((g) => g.tools.map((t) => t.id)));

  /** The default selection for a model: the preferred code tools where the
      model allows them, else the model's first available group — so the
      initial set is always a subset of the visible, removable toggles. */
  const defaultToolsFor = (modelId: string): string[] => {
    const allowed = allowedToolIds(modelId);
    const preferred = PREFERRED_TOOL_DEFAULTS.filter((id) => allowed.has(id));
    if (preferred.length > 0) return preferred;
    return groupsForModel(modelId)[0]?.tools.map((t) => t.id) ?? [];
  };

  // Effective selection: the user's explicit pick, or the model's derived
  // default. Always model-consistent (footer count == checked toggles).
  const tools = toolsOverride ?? defaultToolsFor(model);

  const pickModel = (next: string) => {
    setModel(next);
    // Prune only an explicit user selection; an untouched (null) selection
    // re-derives from the new model's defaults automatically.
    const allowed = allowedToolIds(next);
    setToolsOverride((prev) => (prev == null
      ? null
      : prev.filter((id) => allowed.has(id))));
  };

  const activeModel = getModel(model);
  const budgetMaxTokens = (): number => (activeModel != null
    ? (BUDGET_MAX_USD / activeModel.blendedUsdPerMTok) * 1_000_000
    : 0);
  const budgetTokens = (step: number): number => (budgetMaxTokens() / BUDGET_STEPS) * step;
  const budgetUsd = (step: number): number => (activeModel != null
    ? (budgetTokens(step) / 1_000_000) * activeModel.blendedUsdPerMTok
    : 0);

  const modelOptions = (): VerboseOptionData[] => models.map((m) => ({
    value: m.id,
    label: m.name,
    badges: [
      <Badge
        key="speed"
        tone={m.speed === 'fast'
          ? 'success'
          : m.speed === 'medium'
            ? 'info'
            : 'warning'}
        size="sm"
      >
        {m.speed}
      </Badge>,
      ...m.caps.slice(0, 3),
    ],
    description: m.description,
    meta: m.cost,
  }));

  const nameMissing = name.trim() === '';
  const contextMissing = contextFiles.length === 0;
  const invalid = nameMissing || contextMissing || activeModel == null;

  const groups = groupsForModel(model);
  const footerStatus = nameMissing
    ? 'name is required'
    : contextMissing
      ? 'seed context is required'
      : activeModel == null
        ? 'pick a model'
        : `${tools.length} tool${tools.length === 1
          ? ''
          : 's'} · ${activeModel.speed} · ${formatCompact(budgetTokens(budgetStep))} ≈ $${budgetUsd(budgetStep).toFixed(2)}`;

  const eyebrow = mode === 'edit'
    ? 'Edit agent'
    : mode === 'clone'
      ? 'Clone agent'
      : 'New agent';
  const title = editing
    ? name || agent.name
    : 'Create a reusable persona';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={eyebrow}
      title={title}
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
                : 'Create agent'}
          </Button>
        </>
      )}
    >
      {options == null
        ? <div className="py-10 text-center text-sm text-fg3">Loading options…</div>
        : (
          <div className="flex flex-col gap-4">
            {/* identity — avatar + name/description */}
            <div className="flex items-start gap-4">
              <AvatarSelector
                initials={initials}
                onInitialsChange={setInitials}
                tone={tone}
                onToneChange={setTone}
                maxLength={2}
              />
              <div className="flex flex-1 flex-col gap-3">
                <FormField label="Name" hint="lowercase, dashed. The persona's identifier." required>
                  <TextInput
                    value={name}
                    onChange={(v) => setName(v.toLowerCase().replace(/\s+/g, '-')
                      .replace(/[^a-z0-9-]/g, ''))}
                    invalid={nameMissing}
                    placeholder="the-refactorer"
                  />
                </FormField>
                <FormField
                  label="What does this agent do?"
                  hint="One paragraph. The agent reads this verbatim at the top of every run."
                >
                  <Textarea
                    value={description}
                    onChange={setDescription}
                    rows={3}
                    placeholder="Methodical code rewrites with passing tests. Touches no schemas."
                  />
                </FormField>
              </div>
            </div>

            {/* seed context — required droppable */}
            <FormField
              label="Seed context"
              required
              error={contextMissing
                ? 'At least one context file is required.'
                : undefined}
              hint={contextFiles.length > 0
                ? contextFiles.join(' · ')
                : undefined}
            >
              <Droppable
                accept={{ ext: ['.md', '.txt', '.json'] }}
                onDrop={(files) => setContextFiles((prev) => [...prev, ...files.map((f) => f.name)])}
                label="Drop a context file (.md, .txt, .json)"
                hint="Prompts, style guides, or reference docs the agent always sees."
                compact
              />
            </FormField>

            {/* model */}
            <FormField label="Model" hint="Changing the model changes which tools are available.">
              <VerboseOptionList
                mode="radio"
                ariaLabel="Model"
                value={model}
                onChange={pickModel}
                options={modelOptions()}
              />
            </FormField>

            {/* token budget slider */}
            <FormField
              label="Token budget per run"
              hint={`Hard ceiling — the agent pauses when reached. Max $${BUDGET_MAX_USD} at ${activeModel?.name ?? 'the model'}'s blended rate.`}
            >
              <Slider
                value={budgetStep}
                onChange={setBudgetStep}
                min={1}
                max={BUDGET_STEPS}
                step={1}
                format={(step) => `${formatCompact(budgetTokens(step))} ≈ $${budgetUsd(step).toFixed(2)}`}
              />
            </FormField>

            {/* grouped tools */}
            <FormField
              label="Tools"
              hint={`Available for ${activeModel?.name ?? 'the model'}: ${allowedToolIds(model).size} tools across ${groups.length} groups.`}
            >
              <div className="flex flex-col gap-3.5">
                {groups.map((group) => (
                  <DecoratedToggleList
                    key={group.cap}
                    title={group.cap}
                    value={tools}
                    onChange={setToolsOverride}
                    options={group.tools.map((t) => ({
                      id: t.id,
                      title: t.label,
                      description: t.description,
                      decoration: <Icon name={t.icon as IconName} size={15} />,
                    }))}
                  />
                ))}
              </div>
            </FormField>
          </div>
        )}
    </Modal>
  );
};

AgentEditorModal.displayName = 'AgentEditorModal';
