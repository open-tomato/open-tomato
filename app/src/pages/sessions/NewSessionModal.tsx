import type { NewSessionOptions, ReadyTaskOption, Session } from '../../data';

import {
  Button,
  ChipList,
  DecoratedToggle,
  DecoratedToggleList,
  FormField,
  Icon,
  Modal,
  RadioGroup,
  Select,
  Slider,
  Switch,
  Textarea,
  TextInput,
  Touchable,
} from '@open-tomato/ui-components';
import { useEffect, useMemo, useState } from 'react';

import { api } from '../../data';
import { formatCompact } from '../../lib';

/* Token quota — PoC hardcodes (spec: "~10 steps… estimated from a maximum
 * allowed cost in USD (10usd) using the latest Opus 4.x as reference"; the
 * final version reads workspace settings). Reference: Opus 4.x ≈ $10/MTok
 * blended. */
const MAX_QUOTA_USD = 10;
const OPUS_REFERENCE_USD_PER_MTOK = 10;
const QUOTA_STEPS = 10;
/** Mid-scale default when no roadmap task suggests an effort. */
const DEFAULT_QUOTA_STEP = 5;
const MAX_QUOTA_TOKENS = (MAX_QUOTA_USD / OPUS_REFERENCE_USD_PER_MTOK) * 1_000_000;
const STEP_TOKENS = MAX_QUOTA_TOKENS / QUOTA_STEPS;

const quotaTokens = (step: number): number => step * STEP_TOKENS;
const quotaUsd = (step: number): number => (quotaTokens(step) / 1_000_000) * OPUS_REFERENCE_USD_PER_MTOK;

/** `YYYY-MM-DD HH:MM` (no calendar component yet — spec). */
const SCHEDULE_PATTERN = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/;

const slug = (text: string): string => text.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const WARNING_OPTIONS = [
  { id: 'auto-resume', title: 'Allow auto resume if token limit is reached', description: 'Resumes when the hourly/weekly workspace limit frees up — not the session quota.', decoration: <Icon name="rotate-cw" size={15} /> },
  { id: 'exceed-quota', title: 'Allow exceed session quota', description: 'The run keeps going past the quota above.', decoration: <Icon name="triangle-alert" size={15} /> },
  { id: 'alert-quota', title: 'Alert me if the quota is reached', description: 'Sends a notification the moment the quota trips.', decoration: <Icon name="bell-ring" size={15} /> },
];

export interface NewSessionModalProps {
  open: boolean;
  onClose: () => void;
  /** Active workspace id — sources the task/agent option pools. */
  workspaceId: string;
  /**
   * Fork mode (spec "Sub Page: Fork Session"): prefills everything from the
   * source session except title (suffixed `-forked`), roadmap task (cleared
   * — one session per task) and branch (cleared).
   */
  mode?: 'new' | 'fork';
  /** The session being forked (fork mode). */
  session?: Session;
  /** Resolved runner-agent name of the forked session (fork default). */
  sourceAgentName?: string;
}

/**
 * NewSessionModal — the New Session property form (spec: UI-Sessions.md
 * "Sub Page: New Session"). Composes FormKit (TextInput / Textarea /
 * ChipList / RadioGroup / Slider / DecoratedToggleList), Select, Switch and
 * the Modal's footerStatus. Option pools (ready-for-dev tasks, runner
 * agents) come from `api.sessions.newSessionOptions`. All handlers are PoC
 * mocks; Start only closes.
 */
export const NewSessionModal = ({
  open,
  onClose,
  workspaceId,
  mode = 'new',
  session,
  sourceAgentName,
}: NewSessionModalProps) => {
  const fork = mode === 'fork' && session != null;
  const [options, setOptions] = useState<NewSessionOptions | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.sessions.newSessionOptions(workspaceId)
      .then((opts) => {
        if (!cancelled) setOptions(opts);
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('new-session options load failed', error);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const [title, setTitle] = useState(() => (fork
    ? `${session.title}-forked`
    : 'crimson-lattice'));
  const [description, setDescription] = useState(() => (fork
    ? `Fork of ${session.id} (${session.title}).`
    : ''));
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [branchMode, setBranchMode] = useState<'existing' | 'new'>('new');
  // Branch always starts empty: fork clears it by spec, new starts fresh.
  const [branch, setBranch] = useState('');
  const [runner, setRunner] = useState(() => (fork
    ? sourceAgentName ?? ''
    : ''));
  const defaultSubagents = useMemo(
    () => (fork && sourceAgentName != null
      ? [sourceAgentName]
      : []),
    [fork, sourceAgentName],
  );
  const defaultQuotaStep = fork && session.tokenQuota != null
    ? Math.min(QUOTA_STEPS, Math.max(1, Math.round(session.tokenQuota / STEP_TOKENS)))
    : DEFAULT_QUOTA_STEP;
  const [subagents, setSubagents] = useState<string[]>(defaultSubagents);
  const [quotaStep, setQuotaStep] = useState(defaultQuotaStep);
  const [noLimit, setNoLimit] = useState(() => fork && session.tokenQuota == null);
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [prReview, setPrReview] = useState(false);
  const [notifyDone, setNotifyDone] = useState(true);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const readyTasks = options?.readyTasks ?? [];
  const agentNames = options?.runnerAgents ?? [];
  // Default the runner to the first agent once options land (new mode) —
  // derived, not effect-driven, so a fresh mount picks it up cleanly.
  const effectiveRunner = runner !== ''
    ? runner
    : agentNames[0] ?? '';
  const task = readyTasks.find((t) => t.id === taskIds[0]);

  const scheduleEmpty = scheduleOn && scheduleAt.trim() === '';
  const scheduleInvalid = scheduleOn && scheduleAt.trim() !== '' && !SCHEDULE_PATTERN.test(scheduleAt);
  const titleMissing = title.trim() === '';

  const pickTask = (next: string[]) => {
    setTaskIds(next);
    const picked = readyTasks.find((t) => t.id === next[0]);
    if (picked != null) {
      // Estimated effort drives quota + subagent pre-selection (spec).
      setQuotaStep(Math.min(QUOTA_STEPS, Math.max(1, Math.round(picked.estimatedTokens / STEP_TOKENS))));
      setSubagents(picked.suggestedAgents);
      if (description === '') setDescription(`Roadmap: ${picked.id} · ${picked.title}.`);
    } else {
      setQuotaStep(defaultQuotaStep);
      setSubagents(defaultSubagents);
    }
  };

  const taskBranchStem = (t: ReadyTaskOption): string => slug(t.title).split('-')
    .slice(0, 2)
    .join('-');
  const newBranchPreview = `${task?.type ?? 'feat'}/${slug(title) || 'session'}${task != null
    ? `-${taskBranchStem(task)}`
    : ''}`;

  const footerStatus = titleMissing
    ? 'title is required'
    : scheduleEmpty
      ? 'set a start time (YYYY-MM-DD HH:MM)'
      : scheduleInvalid
        ? 'schedule needs YYYY-MM-DD HH:MM'
        : noLimit
          ? 'no token limit · billed as it runs'
          : `quota ${formatCompact(quotaTokens(quotaStep))} tokens ≈ $${quotaUsd(quotaStep).toFixed(2)}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={fork
        ? 'Fork session'
        : 'New session'}
      title={fork
        ? `Fork ${session.title}`
        : 'Start a new session'}
      footerStatus={footerStatus}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            iconLeading={<Icon name="play" size={15} />}
            disabled={titleMissing || scheduleEmpty || scheduleInvalid}
            onClick={onClose}
          >
            Start
          </Button>
        </>
      )}
    >
      {options == null
        ? <div className="py-10 text-center text-sm text-fg3">Loading options…</div>
        : (
          <div className="flex flex-col gap-4">
            <FormField label="Title" hint="Short unique name — auto-generated, edit freely." required>
              <TextInput value={title} onChange={setTitle} invalid={titleMissing} placeholder="crimson-lattice" />
            </FormField>

            <FormField label="Description" hint="Optional — auto-fills from the roadmap task.">
              <Textarea value={description} onChange={setDescription} rows={3} placeholder="What should this session accomplish?" />
            </FormField>

            <FormField
              label="Roadmap task"
              hint={fork
                ? 'Cleared on fork — only one session per task is permitted, pick a new one.'
                : task != null
                  ? `Estimated effort: ~${formatCompact(task.estimatedTokens)} tokens · agents: ${task.suggestedAgents.join(', ') || 'none'}`
                  : 'Tasks in ready-for-development. Picking one suggests quota and subagents.'}
            >
              <ChipList
                mode="single"
                options={readyTasks.map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` }))}
                value={taskIds}
                onChange={pickTask}
                placeholder="Search roadmap tasks…"
                ariaLabel="Roadmap task"
              />
            </FormField>

            <FormField label="Branch">
              <div className="flex flex-col gap-2.5">
                <RadioGroup
                  ariaLabel="Branch mode"
                  value={branchMode}
                  onChange={(v) => setBranchMode(v as 'existing' | 'new')}
                  options={[
                    { value: 'new', label: 'Create new branch', hint: `Will create ${newBranchPreview}` },
                    { value: 'existing', label: 'Use existing branch' },
                  ]}
                />
                {branchMode === 'existing' && (
                  <TextInput
                    value={branch}
                    onChange={setBranch}
                    placeholder="feat/auth-refactor"
                    prefix={<Icon name="git-branch" size={14} />}
                    aria-label="Existing branch"
                  />
                )}
              </div>
            </FormField>

            <FormField label="Runner agent" hint="Coordinates the session.">
              <Select
                value={effectiveRunner}
                onChange={setRunner}
                width={240}
                ariaLabel="Runner agent"
                options={agentNames.map((a) => ({ value: a, label: a }))}
              />
            </FormField>

            <FormField label="Allowed subagents" hint="Agents the runner may pick up for sub-tasks.">
              <ChipList
                mode="multi"
                options={agentNames.map((a) => ({ value: a, label: a }))}
                value={subagents}
                onChange={setSubagents}
                placeholder="Add subagents…"
                ariaLabel="Allowed subagents"
              />
            </FormField>

            <FormField
              label="Token quota"
              hint={`Max $${MAX_QUOTA_USD} at the latest Opus 4.x reference rate — the final version reads workspace settings.`}
            >
              <div className="flex items-center gap-3">
                <Slider
                  value={quotaStep}
                  onChange={setQuotaStep}
                  min={1}
                  max={QUOTA_STEPS}
                  step={1}
                  format={(step) => (noLimit
                    ? 'no limit'
                    : `${formatCompact(quotaTokens(step))} ≈ $${quotaUsd(step).toFixed(2)}`)}
                  className="flex-1"
                />
                <span className="flex shrink-0 items-center gap-2 text-[13px] text-fg1">
                  <Switch checked={noLimit} onChange={setNoLimit} size="sm" aria-label="No token limit" />
                  no limit
                </span>
              </div>
            </FormField>

            <FormField
              label="Schedule start"
              error={scheduleInvalid
                ? 'Use the YYYY-MM-DD HH:MM format.'
                : undefined}
              hint={!scheduleOn
                ? 'Off — the session starts immediately.'
                : scheduleEmpty
                  ? 'Set a start time (YYYY-MM-DD HH:MM) to enable Start.'
                  : undefined}
            >
              <div className="flex items-center gap-3">
                <Switch checked={scheduleOn} onChange={setScheduleOn} size="sm" aria-label="Schedule start" />
                {scheduleOn && (
                  <TextInput
                    value={scheduleAt}
                    onChange={setScheduleAt}
                    invalid={scheduleInvalid}
                    placeholder="2026-07-24 09:00"
                    prefix={<Icon name="clock" size={14} />}
                    aria-label="Scheduled start time"
                    className="flex-1"
                  />
                )}
              </div>
            </FormField>

            <div className="flex flex-col gap-1.5">
              <DecoratedToggle
                decoration={<Icon name="git-pull-request" size={15} />}
                title="Use automatic PR review"
                description="Off by default — a review agent sweeps the PR when the run lands."
                checked={prReview}
                onChange={setPrReview}
              />
              <DecoratedToggle
                decoration={<Icon name="bell" size={15} />}
                title="Notify when done"
                description="On by default — pings you when the session finishes."
                checked={notifyDone}
                onChange={setNotifyDone}
              />
            </div>

            {/* warning zone — collapsed by default, everything off (spec) */}
            <div className="overflow-hidden rounded-lg border border-danger-tint">
              <Touchable
                stretch
                rounded="none"
                onClick={() => setWarningsOpen((v) => !v)}
                aria-expanded={warningsOpen}
                className="justify-between border-none bg-danger-wash px-3.5 py-2.5 text-[13px] font-semibold text-danger"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="triangle-alert" size={15} />
                  Warning zone
                </span>
                <Icon name={warningsOpen
                  ? 'chevron-up'
                  : 'chevron-down'} size={15} />
              </Touchable>
              {warningsOpen && (
                <div className="p-3">
                  <DecoratedToggleList
                    title="overrides"
                    options={WARNING_OPTIONS}
                    value={warnings}
                    onChange={setWarnings}
                  />
                </div>
              )}
            </div>
          </div>
        )}
    </Modal>
  );
};

NewSessionModal.displayName = 'NewSessionModal';
