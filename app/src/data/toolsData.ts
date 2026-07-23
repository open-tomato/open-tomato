/**
 * Tool editor option sources (WS07 session 3).
 *
 * The system events an API-client webhook can fire on, and the skills the
 * skill-set editor's "Load skills" scan surfaces. Config-level fixtures
 * (deterministic, workspace-independent) — the load gate itself is client
 * state, but the catalog it reveals is served from here. Kept UI-free.
 */

import type { ToolEditorOptions, ToolSkillOption } from './types';

const SYSTEM_EVENTS: { value: string; label: string }[] = [
  { value: 'session.started', label: 'session started' },
  { value: 'session.ended', label: 'session ended' },
  { value: 'session.failed', label: 'session failed' },
  { value: 'session.waiting', label: 'session waiting' },
  { value: 'agent.created', label: 'agent created' },
  { value: 'tool.error', label: 'tool error' },
];

const SAMPLE_SKILLS: ToolSkillOption[] = [
  { id: 'sk-changelog', name: 'changelog', description: 'Walk a git range and produce a humane changelog.' },
  { id: 'sk-doc-tend', name: 'doc-tender', description: 'Sweep docs/ for broken anchors & stale samples.' },
  { id: 'sk-lint', name: 'lint-sweep', description: 'Bulk-apply suggested lint fixes; review-gated.' },
  { id: 'sk-bump', name: 'dep-bump', description: 'Minor & patch dep bumps with green tests.' },
  { id: 'sk-incident', name: 'incident-triage', description: 'Triage an incident from the on-call alert payload.' },
];

export const buildToolEditorOptions = (): ToolEditorOptions => ({
  systemEvents: SYSTEM_EVENTS,
  sampleSkills: SAMPLE_SKILLS,
});
