/**
 * effort-db.ts — SQLite database for effort tracking.
 *
 * Uses bun:sqlite for zero-dependency, high-performance local storage.
 * The DB file lives at <repo-root>/data/effort.sqlite (gitignored).
 *
 * Schema:
 *   collection_runs   — tracks when the collector last ran
 *   issues            — OPT-XXX level, one per branch/PR
 *   sessions          — Claude Code sessions, linked to an issue when possible
 *   tasks             — individual task units within a session
 *   commits           — git commits, linked to an issue when possible
 */

import fs from 'fs';
import path from 'path';

import { Database } from 'bun:sqlite';

// ─────────────────────────────────────────────
//  SCHEMA
// ─────────────────────────────────────────────

const SCHEMA_VERSION = 1;

const MIGRATIONS: string[] = [
  /* v1 — initial schema */
  `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS collection_runs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    run_type      TEXT NOT NULL,          -- 'claude' | 'git' | 'full'
    started_at    TEXT NOT NULL,
    finished_at   TEXT,
    sessions_added INTEGER DEFAULT 0,
    commits_added  INTEGER DEFAULT 0,
    error         TEXT
  );

  CREATE TABLE IF NOT EXISTS issues (
    identifier    TEXT PRIMARY KEY,       -- e.g. 'OPT-221'
    title         TEXT,
    branch        TEXT,                   -- e.g. 'feature/OPT-221'
    pr_number     INTEGER,
    pr_state      TEXT,                   -- 'open' | 'merged' | 'closed'
    pr_merged_at  TEXT,
    pr_created_at TEXT,
    first_seen    TEXT NOT NULL,
    last_updated  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    session_id       TEXT PRIMARY KEY,
    issue_identifier TEXT,                -- FK to issues.identifier (nullable)
    layout           TEXT,                -- 'loose_file' | 'uuid_dir'
    session_type     TEXT,                -- 'ralph_loop' | 'regular'
    task_summary     TEXT,
    model            TEXT,
    first_ts         TEXT,
    last_ts          TEXT,
    duration_minutes REAL,
    event_count      INTEGER DEFAULT 0,
    assistant_turns  INTEGER DEFAULT 0,
    user_turns       INTEGER DEFAULT 0,
    input_tokens     INTEGER DEFAULT 0,
    output_tokens    INTEGER DEFAULT 0,
    cache_read_tokens  INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    cost_usd         REAL DEFAULT 0,
    tool_calls_total INTEGER DEFAULT 0,
    tool_errors      INTEGER DEFAULT 0,
    quota_pauses     INTEGER DEFAULT 0,
    subagent_count   INTEGER DEFAULT 0,
    tool_calls_json  TEXT,                -- JSON breakdown { toolName: count }
    files_touched_json TEXT,              -- JSON array of file paths
    collected_at     TEXT NOT NULL,
    FOREIGN KEY (issue_identifier) REFERENCES issues(identifier)
  );

  CREATE TABLE IF NOT EXISTS commits (
    sha             TEXT PRIMARY KEY,
    issue_identifier TEXT,                -- FK to issues.identifier (nullable)
    timestamp       TEXT NOT NULL,
    subject         TEXT,
    author          TEXT,
    email           TEXT,
    branch          TEXT,
    files_changed   INTEGER DEFAULT 0,
    insertions      INTEGER DEFAULT 0,
    deletions       INTEGER DEFAULT 0,
    files_json      TEXT,                 -- JSON { created, modified, deleted, renamed }
    minutes_since_prev REAL,
    possible_quota_pause INTEGER DEFAULT 0,
    collected_at    TEXT NOT NULL,
    FOREIGN KEY (issue_identifier) REFERENCES issues(identifier)
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_issue ON sessions(issue_identifier);
  CREATE INDEX IF NOT EXISTS idx_commits_issue  ON commits(issue_identifier);
  CREATE INDEX IF NOT EXISTS idx_sessions_ts    ON sessions(first_ts);
  CREATE INDEX IF NOT EXISTS idx_commits_ts     ON commits(timestamp);
  `,
];

// ─────────────────────────────────────────────
//  DATABASE MANAGEMENT
// ─────────────────────────────────────────────

export function getDbPath(repoRoot: string): string {
  return path.join(repoRoot, 'data', 'effort.sqlite');
}

export function openDb(repoRoot: string): Database {
  const dbPath = getDbPath(repoRoot);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  migrate(db);
  return db;
}

function migrate(db: Database): void {
  // Check current version
  try {
    const row = db.query('SELECT MAX(version) as v FROM schema_version').get() as
      | { v: number | null }
      | null;
    const current = row?.v ?? 0;
    if (current >= SCHEMA_VERSION) return;

    for (let i = current; i < SCHEMA_VERSION; i++) {
      db.exec(MIGRATIONS[i]!);
      db.run('INSERT OR REPLACE INTO schema_version (version) VALUES (?)', [i + 1]);
    }
  } catch {
    // Table doesn't exist yet — run all migrations
    for (let i = 0; i < SCHEMA_VERSION; i++) {
      db.exec(MIGRATIONS[i]!);
      db.run('INSERT OR REPLACE INTO schema_version (version) VALUES (?)', [i + 1]);
    }
  }
}

// ─────────────────────────────────────────────
//  INSERT HELPERS (idempotent — skip if exists)
// ─────────────────────────────────────────────

export function upsertIssue(
  db: Database,
  issue: {
    identifier: string;
    title?: string;
    branch?: string;
    pr_number?: number;
    pr_state?: string;
    pr_merged_at?: string;
    pr_created_at?: string;
  },
): void {
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO issues (identifier, title, branch, pr_number, pr_state, pr_merged_at, pr_created_at, first_seen, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(identifier) DO UPDATE SET
       title = COALESCE(excluded.title, issues.title),
       branch = COALESCE(excluded.branch, issues.branch),
       pr_number = COALESCE(excluded.pr_number, issues.pr_number),
       pr_state = COALESCE(excluded.pr_state, issues.pr_state),
       pr_merged_at = COALESCE(excluded.pr_merged_at, issues.pr_merged_at),
       pr_created_at = COALESCE(excluded.pr_created_at, issues.pr_created_at),
       last_updated = excluded.last_updated`,
    [
      issue.identifier,
      issue.title ?? null,
      issue.branch ?? null,
      issue.pr_number ?? null,
      issue.pr_state ?? null,
      issue.pr_merged_at ?? null,
      issue.pr_created_at ?? null,
      now,
      now,
    ],
  );
}

export function insertSession(
  db: Database,
  session: {
    session_id: string;
    issue_identifier?: string;
    layout?: string;
    session_type?: string;
    task_summary?: string;
    model?: string;
    first_ts?: string;
    last_ts?: string;
    duration_minutes?: number;
    event_count?: number;
    assistant_turns?: number;
    user_turns?: number;
    input_tokens?: number;
    output_tokens?: number;
    cache_read_tokens?: number;
    cache_write_tokens?: number;
    cost_usd?: number;
    tool_calls_total?: number;
    tool_errors?: number;
    quota_pauses?: number;
    subagent_count?: number;
    tool_calls_json?: string;
    files_touched_json?: string;
  },
): boolean {
  // Idempotent: skip if session already exists
  const existing = db
    .query('SELECT 1 FROM sessions WHERE session_id = ?')
    .get(session.session_id);
  if (existing) return false;

  const now = new Date().toISOString();
  db.run(
    `INSERT INTO sessions (
      session_id, issue_identifier, layout, session_type, task_summary, model,
      first_ts, last_ts, duration_minutes, event_count,
      assistant_turns, user_turns,
      input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
      cost_usd, tool_calls_total, tool_errors, quota_pauses, subagent_count,
      tool_calls_json, files_touched_json, collected_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.session_id,
      session.issue_identifier ?? null,
      session.layout ?? null,
      session.session_type ?? null,
      session.task_summary ?? null,
      session.model ?? null,
      session.first_ts ?? null,
      session.last_ts ?? null,
      session.duration_minutes ?? null,
      session.event_count ?? 0,
      session.assistant_turns ?? 0,
      session.user_turns ?? 0,
      session.input_tokens ?? 0,
      session.output_tokens ?? 0,
      session.cache_read_tokens ?? 0,
      session.cache_write_tokens ?? 0,
      session.cost_usd ?? 0,
      session.tool_calls_total ?? 0,
      session.tool_errors ?? 0,
      session.quota_pauses ?? 0,
      session.subagent_count ?? 0,
      session.tool_calls_json ?? null,
      session.files_touched_json ?? null,
      now,
    ],
  );
  return true;
}

export function insertCommit(
  db: Database,
  commit: {
    sha: string;
    issue_identifier?: string;
    timestamp: string;
    subject?: string;
    author?: string;
    email?: string;
    branch?: string;
    files_changed?: number;
    insertions?: number;
    deletions?: number;
    files_json?: string;
    minutes_since_prev?: number;
    possible_quota_pause?: boolean;
  },
): boolean {
  const existing = db.query('SELECT 1 FROM commits WHERE sha = ?').get(commit.sha);
  if (existing) return false;

  const now = new Date().toISOString();
  db.run(
    `INSERT INTO commits (
      sha, issue_identifier, timestamp, subject, author, email, branch,
      files_changed, insertions, deletions, files_json,
      minutes_since_prev, possible_quota_pause, collected_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      commit.sha,
      commit.issue_identifier ?? null,
      commit.timestamp,
      commit.subject ?? null,
      commit.author ?? null,
      commit.email ?? null,
      commit.branch ?? null,
      commit.files_changed ?? 0,
      commit.insertions ?? 0,
      commit.deletions ?? 0,
      commit.files_json ?? null,
      commit.minutes_since_prev ?? null,
      commit.possible_quota_pause
        ? 1
        : 0,
      now,
    ],
  );
  return true;
}

export function startCollectionRun(db: Database, runType: string): number {
  const now = new Date().toISOString();
  const result = db.run(
    'INSERT INTO collection_runs (run_type, started_at) VALUES (?, ?)',
    [runType, now],
  );
  return Number(result.lastInsertRowid);
}

export function finishCollectionRun(
  db: Database,
  runId: number,
  stats: { sessions_added?: number; commits_added?: number; error?: string },
): void {
  const now = new Date().toISOString();
  db.run(
    `UPDATE collection_runs SET
      finished_at = ?, sessions_added = ?, commits_added = ?, error = ?
     WHERE id = ?`,
    [now, stats.sessions_added ?? 0, stats.commits_added ?? 0, stats.error ?? null, runId],
  );
}

// ─────────────────────────────────────────────
//  QUERY HELPERS (for dashboard API)
// ─────────────────────────────────────────────

export interface EffortSummary {
  total_sessions: number;
  total_commits: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_duration_minutes: number;
  total_tool_calls: number;
  total_tool_errors: number;
  total_insertions: number;
  total_deletions: number;
  issue_count: number;
  linked_sessions: number;
  linked_commits: number;
}

export function getEffortSummary(db: Database): EffortSummary {
  const row = db
    .query(
      `SELECT
        (SELECT COUNT(*) FROM sessions) as total_sessions,
        (SELECT COUNT(*) FROM commits) as total_commits,
        (SELECT COALESCE(SUM(input_tokens), 0) FROM sessions) as total_input_tokens,
        (SELECT COALESCE(SUM(output_tokens), 0) FROM sessions) as total_output_tokens,
        (SELECT COALESCE(SUM(cost_usd), 0) FROM sessions) as total_cost_usd,
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM sessions) as total_duration_minutes,
        (SELECT COALESCE(SUM(tool_calls_total), 0) FROM sessions) as total_tool_calls,
        (SELECT COALESCE(SUM(tool_errors), 0) FROM sessions) as total_tool_errors,
        (SELECT COALESCE(SUM(insertions), 0) FROM commits) as total_insertions,
        (SELECT COALESCE(SUM(deletions), 0) FROM commits) as total_deletions,
        (SELECT COUNT(*) FROM issues) as issue_count,
        (SELECT COUNT(*) FROM sessions WHERE issue_identifier IS NOT NULL) as linked_sessions,
        (SELECT COUNT(*) FROM commits WHERE issue_identifier IS NOT NULL) as linked_commits`,
    )
    .get() as EffortSummary;
  return row;
}

export interface IssueEffort {
  identifier: string;
  title: string | null;
  branch: string | null;
  pr_number: number | null;
  pr_state: string | null;
  pr_merged_at: string | null;
  session_count: number;
  commit_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_duration_minutes: number;
  total_tool_calls: number;
  total_tool_errors: number;
  total_insertions: number;
  total_deletions: number;
  first_activity: string | null;
  last_activity: string | null;
  // Computed efficiency metrics
  tokens_per_session: number;
  tokens_per_commit: number;
}

export function getIssueEfforts(db: Database): IssueEffort[] {
  const rows = db
    .query(
      `SELECT
        i.identifier,
        i.title,
        i.branch,
        i.pr_number,
        i.pr_state,
        i.pr_merged_at,
        COALESCE(s.session_count, 0) as session_count,
        COALESCE(c.commit_count, 0) as commit_count,
        COALESCE(s.total_input_tokens, 0) as total_input_tokens,
        COALESCE(s.total_output_tokens, 0) as total_output_tokens,
        COALESCE(s.total_cost_usd, 0) as total_cost_usd,
        COALESCE(s.total_duration_minutes, 0) as total_duration_minutes,
        COALESCE(s.total_tool_calls, 0) as total_tool_calls,
        COALESCE(s.total_tool_errors, 0) as total_tool_errors,
        COALESCE(c.total_insertions, 0) as total_insertions,
        COALESCE(c.total_deletions, 0) as total_deletions,
        COALESCE(s.first_ts, c.first_ts) as first_activity,
        COALESCE(s.last_ts, c.last_ts) as last_activity
      FROM issues i
      LEFT JOIN (
        SELECT issue_identifier,
          COUNT(*) as session_count,
          SUM(input_tokens) as total_input_tokens,
          SUM(output_tokens) as total_output_tokens,
          SUM(cost_usd) as total_cost_usd,
          SUM(duration_minutes) as total_duration_minutes,
          SUM(tool_calls_total) as total_tool_calls,
          SUM(tool_errors) as total_tool_errors,
          MIN(first_ts) as first_ts,
          MAX(last_ts) as last_ts
        FROM sessions
        WHERE issue_identifier IS NOT NULL
        GROUP BY issue_identifier
      ) s ON s.issue_identifier = i.identifier
      LEFT JOIN (
        SELECT issue_identifier,
          COUNT(*) as commit_count,
          SUM(insertions) as total_insertions,
          SUM(deletions) as total_deletions,
          MIN(timestamp) as first_ts,
          MAX(timestamp) as last_ts
        FROM commits
        WHERE issue_identifier IS NOT NULL
        GROUP BY issue_identifier
      ) c ON c.issue_identifier = i.identifier
      WHERE COALESCE(s.session_count, 0) + COALESCE(c.commit_count, 0) > 0
      ORDER BY last_activity DESC`,
    )
    .all() as (IssueEffort & { tokens_per_session?: number; tokens_per_commit?: number })[];

  // Compute efficiency metrics
  return rows.map((r) => {
    const totalTokens = r.total_input_tokens + r.total_output_tokens;
    return {
      ...r,
      tokens_per_session: r.session_count > 0
        ? Math.round(totalTokens / r.session_count)
        : 0,
      tokens_per_commit: r.commit_count > 0
        ? Math.round(totalTokens / r.commit_count)
        : 0,
    };
  });
}

export interface SessionDetail {
  session_id: string;
  issue_identifier: string | null;
  session_type: string | null;
  task_summary: string | null;
  model: string | null;
  first_ts: string | null;
  last_ts: string | null;
  duration_minutes: number | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  tool_calls_total: number;
  tool_errors: number;
}

export function getSessionsByIssue(db: Database, identifier: string): SessionDetail[] {
  return db
    .query(
      `SELECT session_id, issue_identifier, session_type, task_summary, model,
              first_ts, last_ts, duration_minutes,
              input_tokens, output_tokens, cost_usd,
              tool_calls_total, tool_errors
       FROM sessions
       WHERE issue_identifier = ?
       ORDER BY first_ts ASC`,
    )
    .all(identifier) as SessionDetail[];
}

export interface TimeSeriesPoint {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  session_count: number;
  commit_count: number;
  avg_tokens_per_session: number;
}

export function getDailyEffort(db: Database): TimeSeriesPoint[] {
  const dates = db
    .query(
      `SELECT DISTINCT date FROM (
        SELECT DATE(first_ts) as date FROM sessions WHERE first_ts IS NOT NULL
        UNION
        SELECT DATE(timestamp) as date FROM commits WHERE timestamp IS NOT NULL
      ) ORDER BY date ASC`,
    )
    .all() as { date: string }[];

  return dates.map(({ date }) => {
    const s = db
      .query(
        `SELECT
          COALESCE(SUM(input_tokens), 0) as input_tokens,
          COALESCE(SUM(output_tokens), 0) as output_tokens,
          COALESCE(SUM(cost_usd), 0) as cost_usd,
          COUNT(*) as session_count
        FROM sessions WHERE DATE(first_ts) = ?`,
      )
      .get(date) as { input_tokens: number; output_tokens: number; cost_usd: number; session_count: number };

    const c = db
      .query('SELECT COUNT(*) as commit_count FROM commits WHERE DATE(timestamp) = ?')
      .get(date) as { commit_count: number };

    const totalTokens = s.input_tokens + s.output_tokens;
    return {
      date,
      input_tokens: s.input_tokens,
      output_tokens: s.output_tokens,
      cost_usd: s.cost_usd,
      session_count: s.session_count,
      commit_count: c.commit_count,
      avg_tokens_per_session: s.session_count > 0
        ? Math.round(totalTokens / s.session_count)
        : 0,
    };
  });
}

// ─────────────────────────────────────────────
//  EFFICIENCY / RATIO ANALYTICS
// ─────────────────────────────────────────────

export interface EfficiencyPoint {
  date: string;
  sessions: number;
  total_tokens: number;
  avg_tokens_per_session: number;
  commits: number;
  tokens_per_commit: number;
}

export function getDailyEfficiency(db: Database): EfficiencyPoint[] {
  const dates = db
    .query(
      `SELECT DISTINCT date FROM (
        SELECT DATE(first_ts) as date FROM sessions WHERE first_ts IS NOT NULL
        UNION
        SELECT DATE(timestamp) as date FROM commits WHERE timestamp IS NOT NULL
      ) ORDER BY date ASC`,
    )
    .all() as { date: string }[];

  return dates.map(({ date }) => {
    const s = db
      .query(
        `SELECT
          COUNT(*) as sessions,
          COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens
        FROM sessions WHERE DATE(first_ts) = ?`,
      )
      .get(date) as { sessions: number; total_tokens: number };

    const c = db
      .query('SELECT COUNT(*) as commits FROM commits WHERE DATE(timestamp) = ?')
      .get(date) as { commits: number };

    return {
      date,
      sessions: s.sessions,
      total_tokens: s.total_tokens,
      avg_tokens_per_session: s.sessions > 0
        ? Math.round(s.total_tokens / s.sessions)
        : 0,
      commits: c.commits,
      tokens_per_commit: c.commits > 0
        ? Math.round(s.total_tokens / c.commits)
        : 0,
    };
  });
}

export interface IssueComplexity {
  identifier: string;
  branch: string | null;
  session_count: number;
  commit_count: number;
  total_tokens: number;
  tokens_per_session: number;
  tokens_per_commit: number;
  error_rate: number;
  duration_minutes: number;
}

export function getIssueComplexity(db: Database): IssueComplexity[] {
  return db
    .query(
      `SELECT
        i.identifier,
        i.branch,
        COALESCE(s.session_count, 0) as session_count,
        COALESCE(c.commit_count, 0) as commit_count,
        COALESCE(s.total_tokens, 0) as total_tokens,
        CASE WHEN COALESCE(s.session_count, 0) > 0
          THEN ROUND(COALESCE(s.total_tokens, 0) * 1.0 / s.session_count)
          ELSE 0 END as tokens_per_session,
        CASE WHEN COALESCE(c.commit_count, 0) > 0
          THEN ROUND(COALESCE(s.total_tokens, 0) * 1.0 / c.commit_count)
          ELSE 0 END as tokens_per_commit,
        CASE WHEN COALESCE(s.total_tool_calls, 0) > 0
          THEN ROUND(COALESCE(s.total_tool_errors, 0) * 100.0 / s.total_tool_calls, 1)
          ELSE 0 END as error_rate,
        COALESCE(s.duration, 0) as duration_minutes
      FROM issues i
      LEFT JOIN (
        SELECT issue_identifier,
          COUNT(*) as session_count,
          SUM(input_tokens + output_tokens) as total_tokens,
          SUM(tool_calls_total) as total_tool_calls,
          SUM(tool_errors) as total_tool_errors,
          SUM(duration_minutes) as duration
        FROM sessions
        WHERE issue_identifier IS NOT NULL
        GROUP BY issue_identifier
      ) s ON s.issue_identifier = i.identifier
      LEFT JOIN (
        SELECT issue_identifier, COUNT(*) as commit_count
        FROM commits WHERE issue_identifier IS NOT NULL
        GROUP BY issue_identifier
      ) c ON c.issue_identifier = i.identifier
      WHERE COALESCE(s.session_count, 0) > 0
      ORDER BY total_tokens DESC`,
    )
    .all() as IssueComplexity[];
}
