import type { Task, TaskFormOptions, TaskPriority, TaskStatus } from '../../data';
import type { ChipOption } from '@open-tomato/ui-components';

import {
  Button,
  ChipList,
  Divider,
  Droppable,
  FormField,
  Icon,
  Modal,
  Select,
  Textarea,
  TextInput,
} from '@open-tomato/ui-components';
import { useEffect, useState } from 'react';

import { api, resolveOwnerHandle } from '../../data';

/** `YYYY-MM-DD` with an optional ` HH:MM` (no calendar component yet — spec). */
const ETA_PATTERN = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/;

/** ISO timestamp → `YYYY-MM-DD` (the ETA input's date-only format). */
const toEtaString = (iso?: string): string => (iso == null
  ? ''
  : iso.slice(0, 10));

const STATUS_OPTIONS = [
  { value: 'todo', label: 'todo' },
  { value: 'ready-for-dev', label: 'ready for dev' },
  { value: 'in-progress', label: 'in progress' },
  { value: 'blocked', label: 'blocked' },
  { value: 'done', label: 'done' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'low' },
  { value: 'medium', label: 'medium' },
  { value: 'high', label: 'high' },
];

export type TaskFormMode = 'new' | 'edit';

export interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Active workspace id — sources the owner / tag / relation option pools. */
  workspaceId: string;
  mode?: TaskFormMode;
  /** The task being edited (edit mode). */
  task?: Task;
}

/**
 * TaskFormModal — the New / Edit Task form (spec: the WS04 reference
 * TaskFormModal, UI-Roadmap.md). Composes TextInput/Textarea, three
 * Selects (status/priority/owner), an `allowNew` tags ChipList, a
 * format-validated ETA input, an Attachments Droppable, and the Relations
 * block: a single-mode parent ChipList, a multi subtasks ChipList, and a
 * danger-framed blocked-by / blocking group. Option pools come from
 * `api.tasks.formOptions`.
 *
 * Task-id ChipLists exclude the task itself (edit). All handlers are PoC
 * mocks; Save only closes. Reset-on-open is structural — parents mount
 * this only while open (fresh state per open).
 */
export const TaskFormModal = ({
  open,
  onClose,
  workspaceId,
  mode = 'new',
  task,
}: TaskFormModalProps) => {
  const editing = mode === 'edit' && task != null;
  const [options, setOptions] = useState<TaskFormOptions | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.tasks.formOptions(workspaceId)
      .then((opts) => { if (!cancelled) setOptions(opts); })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error('task-form options load failed', error);
      });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const [title, setTitle] = useState(() => (editing
    ? task.title
    : ''));
  const [description, setDescription] = useState(() => (editing
    ? task.description ?? ''
    : ''));
  const [status, setStatus] = useState<TaskStatus>(() => (editing
    ? task.status
    : 'todo'));
  const [priority, setPriority] = useState<TaskPriority>(() => (editing
    ? task.priority
    : 'medium'));
  const [owner, setOwner] = useState(() => (editing
    ? resolveOwnerHandle(task.ownerId)
    : 'agent'));
  const [tags, setTags] = useState<string[]>(() => (editing
    ? [...task.tags]
    : []));
  const [eta, setEta] = useState(() => (editing
    ? toEtaString(task.eta)
    : ''));
  const [parent, setParent] = useState<string[]>(() => (editing && task.parentId != null
    ? [task.parentId]
    : []));
  const [subtasks, setSubtasks] = useState<string[]>(() => (editing
    ? [...task.subtaskIds]
    : []));
  const [blockedBy, setBlockedBy] = useState<string[]>(() => (editing
    ? [...task.blockedBy]
    : []));
  const [blocking, setBlocking] = useState<string[]>(() => (editing
    ? [...task.blocking]
    : []));

  // Task-id options exclude the current task (a task can't relate to itself).
  const taskOptions: ChipOption[] = (options?.tasks ?? [])
    .filter((t) => !editing || t.id !== task.id)
    .map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` }));
  const tagOptions: ChipOption[] = (options?.tags ?? []).map((tag) => ({ value: tag, label: tag }));
  const ownerOptions = (options?.owners ?? []).map((handle) => ({
    value: handle,
    label: handle === 'agent'
      ? 'agent'
      : `@${handle}`,
  }));

  const titleMissing = title.trim() === '';
  const etaInvalid = eta.trim() !== '' && !ETA_PATTERN.test(eta.trim());
  const invalid = titleMissing || etaInvalid;

  const footerStatus = titleMissing
    ? 'title is required'
    : etaInvalid
      ? 'ETA needs YYYY-MM-DD'
      : editing
        ? `editing ${task.id}`
        : 'new roadmap task';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={editing
        ? 'Edit task'
        : 'New task'}
      title={editing
        ? task.id
        : 'Add a roadmap task'}
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
            {editing
              ? 'Save changes'
              : 'Create task'}
          </Button>
        </>
      )}
    >
      {options == null
        ? <div className="py-10 text-center text-sm text-fg3">Loading options…</div>
        : (
          <div className="flex flex-col gap-4">
            <FormField label="Title" required>
              <TextInput
                value={title}
                onChange={setTitle}
                invalid={titleMissing}
                placeholder="Short, action-first summary"
              />
            </FormField>

            <FormField label="Description">
              <Textarea
                value={description}
                onChange={setDescription}
                rows={3}
                placeholder="What needs to happen, and why?"
              />
            </FormField>

            <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
              <FormField label="Status">
                <Select
                  value={status}
                  onChange={(v) => setStatus(v as TaskStatus)}
                  width={180}
                  ariaLabel="Status"
                  options={STATUS_OPTIONS}
                />
              </FormField>
              <FormField label="Priority">
                <Select
                  value={priority}
                  onChange={(v) => setPriority(v as TaskPriority)}
                  width={180}
                  ariaLabel="Priority"
                  options={PRIORITY_OPTIONS}
                />
              </FormField>
              <FormField label="Owner">
                <Select
                  value={owner}
                  onChange={setOwner}
                  width={180}
                  ariaLabel="Owner"
                  options={ownerOptions}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
              <FormField label="Tags" hint="Existing tags or type a new one.">
                <ChipList
                  mode="multi"
                  allowNew
                  options={tagOptions}
                  value={tags}
                  onChange={setTags}
                  placeholder="Add tags…"
                  ariaLabel="Tags"
                />
              </FormField>
              <FormField
                label="ETA"
                error={etaInvalid
                  ? 'Use the YYYY-MM-DD format.'
                  : undefined}
                hint={!etaInvalid
                  ? 'Date only for now (no calendar component yet).'
                  : undefined}
              >
                <TextInput
                  value={eta}
                  onChange={setEta}
                  invalid={etaInvalid}
                  placeholder="2026-07-28"
                  prefix={<Icon name="calendar" size={14} />}
                />
              </FormField>
            </div>

            <Divider label="Attachments" />
            <Droppable
              onDrop={() => {}}
              label="Drop an attachment"
              hint="Specs, screenshots, or reference files for this task."
              compact
            />

            <Divider label="Relations" />
            <FormField label="Parent task" hint="One parent — this task rolls up into it.">
              <ChipList
                mode="single"
                options={taskOptions}
                value={parent}
                onChange={setParent}
                placeholder="Pick a parent task…"
                ariaLabel="Parent task"
              />
            </FormField>
            <FormField label="Subtasks">
              <ChipList
                mode="multi"
                options={taskOptions}
                value={subtasks}
                onChange={setSubtasks}
                placeholder="Add subtasks…"
                ariaLabel="Subtasks"
              />
            </FormField>

            {/* danger-framed blocking group */}
            <div className="flex flex-col gap-3 rounded-lg border border-danger-tint bg-danger-wash p-3.5">
              <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-danger">
                <Icon name="octagon-alert" size={15} />
                Blocking relations
              </span>
              <FormField label="Blocked by" hint="Tasks that must land before this one can start.">
                <ChipList
                  mode="multi"
                  options={taskOptions}
                  value={blockedBy}
                  onChange={setBlockedBy}
                  placeholder="Add blockers…"
                  ariaLabel="Blocked by"
                />
              </FormField>
              <FormField label="Blocking" hint="Tasks that can't start until this one lands.">
                <ChipList
                  mode="multi"
                  options={taskOptions}
                  value={blocking}
                  onChange={setBlocking}
                  placeholder="Add tasks this blocks…"
                  ariaLabel="Blocking"
                />
              </FormField>
            </div>
          </div>
        )}
    </Modal>
  );
};

TaskFormModal.displayName = 'TaskFormModal';
