
import {
  Zap, Bot, Book, Cpu, LayoutDashboard, List, Terminal, Settings,
  type LucideIcon,
} from 'lucide-react';
const SEED_AGENTS = [
  {
    id: 'agent-7d2f', name: 'auth-refactor',
    status: 'running',
    goal: 'Refactor the auth flow to use the new session token format. Touch only files in src/auth/.',
    model: 'haiku-4-5', tokens: 12348, tokensMax: 50000, tools: 4, elapsed: '2m 14s', files: 8,
    color: 'var(--primary)',
  },
  {
    id: 'agent-3a9c', name: 'settings-page',
    status: 'running',
    goal: 'Add a settings page with theme toggle, account info, and danger zone for delete account.',
    model: 'sonnet-4-5', tokens: 38120, tokensMax: 50000, tools: 5, elapsed: '8m 02s', files: 12,
    color: 'var(--accent)',
  },
  {
    id: 'agent-b14e', name: 'docs-typos',
    status: 'done',
    goal: 'Fix typos and broken anchor links flagged in the docs lint report.',
    model: 'haiku-4-5', tokens: 4280, tokensMax: 10000, tools: 2, elapsed: '1m 11s', files: 23,
    color: 'var(--green-500)',
  },
  {
    id: 'agent-9k2m', name: 'perf-investigate',
    status: 'waiting',
    goal: 'Investigate slow query in /dashboard/agents endpoint — produce findings + suggested indexes.',
    model: 'opus-4-5', tokens: 0, tokensMax: 200000, tools: 6, elapsed: '—', files: 0,
    color: 'var(--gold-500)',
  },
  {
    id: 'agent-4f7p', name: 'rate-limit-bug',
    status: 'failed',
    goal: 'Repro the rate-limit-on-retry bug filed in #214 and propose a fix.',
    model: 'sonnet-4-5', tokens: 22030, tokensMax: 50000, tools: 4, elapsed: '5m 47s', files: 3,
    color: 'var(--red-700)',
  },
];

const SEED_TASKS = [
  { id: 1, title: 'Migrate dashboard to new sidebar layout', status: 'in-progress', priority: 'high', owner: 'agent', eta: 'today', tag: 'ui · feat' },
  { id: 2, title: 'Add per-tool spend chart to usage page', status: 'todo', priority: 'high', owner: 'sam', eta: 'this week', tag: 'usage · feat' },
  { id: 3, title: 'Cache agent run logs locally for replay', status: 'todo', priority: 'medium', owner: 'agent', eta: 'next week', tag: 'perf' },
  { id: 4, title: 'Document the new --budget flag in the CLI', status: 'in-progress', priority: 'medium', owner: 'agent', eta: 'today', tag: 'docs' },
  { id: 5, title: 'Fix flaky test in auth/session.test.ts', status: 'done', priority: 'low', owner: 'ren', eta: 'yesterday', tag: 'infra · bug' },
  { id: 6, title: 'Compost stale context after 24h idle', status: 'todo', priority: 'medium', owner: 'agent', eta: 'this month', tag: 'experiment' },
];

interface NavItem {
  id: string;
  label: string;
  Icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'sessions', label: 'Sessions', Icon: Terminal },
  { id: 'agents', label: 'Agents', Icon: Bot },
  { id: 'roadmap', label: 'Roadmap', Icon: List },
  { id: 'tools', label: 'Tools', Icon: Cpu },
  { id: 'usage', label: 'Usage', Icon: Zap },
];
const NAV_SECONDARY: NavItem[] = [
  { id: 'docs', label: 'Docs', Icon: Book },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

const TITLE_MAP = {
  overview: { t: 'Overview', s: 'what\'s running and where it\'s headed' },
  sessions: { t: 'Sessions', s: 'every run, every output, replayable' },
  agents: { t: 'Agents', s: 'your fleet' },
  roadmap: { t: 'Roadmap', s: 'tasks · seed an agent from any of them' },
  tools: { t: 'Tools', s: 'what your agents can touch' },
  usage: { t: 'Usage', s: 'tokens, dollars, time' },
  docs: { t: 'Docs', s: '—' },
  settings: { t: 'Settings', s: '—' },
};

export { SEED_AGENTS, SEED_TASKS, NAV_ITEMS, NAV_SECONDARY, TITLE_MAP };
