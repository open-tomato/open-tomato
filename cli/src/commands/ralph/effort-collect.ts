#!/usr/bin/env bun
/**
 * effort-collect.ts — Ralph Loop Effort Collector (TypeScript port)
 *
 * Parses Claude Code session logs and git history, then stores per-session
 * and per-commit effort data into a local SQLite database. Designed to be
 * incremental: sessions/commits already in the DB are skipped.
 *
 * Usage:
 *   tomato ralph effort-collect [--since 2025-01-01] [--no-git] [--no-claude] [--verbose]
 *
 * The script never reads full session JSONL content into memory at once —
 * it streams line-by-line to avoid flooding context/memory.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

import {
  openDb,
  upsertIssue,
  insertSession,
  insertCommit,
  startCollectionRun,
  finishCollectionRun,
} from './utils/effort-db.js';
import { getRepoRoot } from './utils/git.js';

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────

const ISSUE_PATTERN = /\b(OPT-\d+)\b/i;

const RALPH_LOOP_PATTERNS = [
  /your current scoped task/i,
  /your current task/i,
  /your current\s+\w*\s*task/i,
];

const QUOTA_PATTERNS = [
  /rate.?limit/i,
  /quota/i,
  /too many requests/i,
  /\b429\b/,
  /usage limit/i,
  /claude\.ai\/\S*limit/i,
];

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

function isQuotaEvent(text: string): boolean {
  return QUOTA_PATTERNS.some((p) => p.test(text));
}

function extractIssueId(text: string): string | null {
  const m = text.match(ISSUE_PATTERN);
  return m
    ? m[1]!.toUpperCase()
    : null;
}

/**
 * Resolve the Claude Code project session directory for this repo.
 * Claude stores sessions under ~/.claude/projects/<mangled-path>/
 * where the mangled path replaces / with -.
 */
function findClaudeSessionDir(repoPath: string): string | null {
  const claudeBase = path.join(
    process.env['HOME'] ?? '~',
    '.claude',
    'projects',
  );
  if (!fs.existsSync(claudeBase)) return null;

  // The mangled name is the absolute path with / replaced by -
  const mangled = repoPath.replace(/\//g, '-');
  const candidate = path.join(claudeBase, mangled);
  if (fs.existsSync(candidate)) return candidate;

  // Also try without leading dash
  const mangledNoLeading = mangled.replace(/^-/, '');
  const candidate2 = path.join(claudeBase, mangledNoLeading);
  if (fs.existsSync(candidate2)) return candidate2;

  // Fallback: scan for matching directory
  for (const entry of fs.readdirSync(claudeBase)) {
    if (entry.includes(path.basename(repoPath))) {
      const full = path.join(claudeBase, entry);
      if (fs.statSync(full).isDirectory()) return full;
    }
  }

  return null;
}

// ─────────────────────────────────────────────
//  SESSION PARSER (streaming, line-by-line)
// ─────────────────────────────────────────────

interface SessionStats {
  session_id: string;
  layout: 'loose_file' | 'uuid_dir';
  session_type: 'ralph_loop' | 'regular' | 'unknown_loose';
  task_summary: string | null;
  issue_identifier: string | null;
  model: string | null;
  first_ts: string | null;
  last_ts: string | null;
  duration_minutes: number | null;
  event_count: number;
  assistant_turns: number;
  user_turns: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
  tool_calls: Record<string, number>;
  tool_errors: number;
  quota_pauses: number;
  subagent_count: number;
  files_touched: Set<string>;
}

function makeEmptyStats(sessionId: string): SessionStats {
  return {
    session_id: sessionId,
    layout: 'loose_file',
    session_type: 'unknown_loose',
    task_summary: null,
    issue_identifier: null,
    model: null,
    first_ts: null,
    last_ts: null,
    duration_minutes: null,
    event_count: 0,
    assistant_turns: 0,
    user_turns: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    cost_usd: 0,
    tool_calls: {},
    tool_errors: 0,
    quota_pauses: 0,
    subagent_count: 0,
    files_touched: new Set(),
  };
}

/**
 * Stream-parse a JSONL file line by line, accumulating stats without
 * loading the entire file into memory.
 */
async function ingestJsonl(
  filePath: string,
  stats: SessionStats,
  timestamps: Date[],
  since: Date | null,
): Promise<void> {
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) continue;

    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    // Timestamp extraction
    const tsStr =
      (obj['timestamp'] as string) ??
      (obj['ts'] as string) ??
      (obj['created_at'] as string);
    if (tsStr) {
      try {
        const ts = new Date(String(tsStr).replace('Z', '+00:00'));
        if (!isNaN(ts.getTime())) {
          if (since && ts < since) continue;
          timestamps.push(ts);
        }
      } catch {
        /* skip bad timestamps */
      }
    }

    stats.event_count++;

    // Role counting
    const role = (obj['role'] as string) ?? (obj['type'] as string);
    if (role === 'assistant') stats.assistant_turns++;
    else if (role === 'user') stats.user_turns++;

    // Token usage
    const usage =
      (obj['usage'] as Record<string, number>) ??
      ((obj['message'] as Record<string, unknown>)?.['usage'] as Record<string, number>) ??
      {};
    stats.input_tokens += usage['input_tokens'] ?? 0;
    stats.output_tokens += usage['output_tokens'] ?? 0;
    stats.cache_read_tokens += usage['cache_read_input_tokens'] ?? 0;
    stats.cache_write_tokens += usage['cache_creation_input_tokens'] ?? 0;

    // Cost
    const cost = (obj['costUSD'] ?? obj['cost_usd'] ?? obj['cost'] ?? 0) as number;
    if (typeof cost === 'number') stats.cost_usd += cost;

    // Model
    const model =
      (obj['model'] as string) ??
      ((obj['message'] as Record<string, unknown>)?.['model'] as string);
    if (model && !stats.model) stats.model = model;

    // Content blocks — tool calls and tool results
    let content =
      (obj['content'] as unknown[]) ??
      ((obj['message'] as Record<string, unknown>)?.['content'] as unknown[]) ??
      [];
    if (typeof content === 'string') content = [];

    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const b = block as Record<string, unknown>;
      const btype = b['type'] as string;

      if (btype === 'tool_use') {
        const toolName = (b['name'] as string) ?? 'unknown';
        stats.tool_calls[toolName] = (stats.tool_calls[toolName] ?? 0) + 1;

        const inp = (b['input'] as Record<string, unknown>) ?? {};
        for (const key of ['path', 'file_path', 'file', 'new_path', 'old_path']) {
          const val = inp[key];
          if (val && typeof val === 'string' && (val.includes('/') || val.includes('\\'))) {
            stats.files_touched.add(val);
          }
        }
        const cmd = (inp['command'] as string) ?? '';
        for (const tok of cmd.split(/\s+/)) {
          if (tok.startsWith('/') || tok.startsWith('./')) {
            stats.files_touched.add(tok.replace(/["']/g, ''));
          }
        }
      } else if (btype === 'tool_result') {
        const isError = b['is_error'] === true;
        let rc = (b['content'] as unknown) ?? '';
        if (Array.isArray(rc)) {
          rc = rc
            .filter((x): x is Record<string, string> => typeof x === 'object')
            .map((x) => x['text'] ?? '')
            .join(' ');
        }
        const rcStr = String(rc);
        if (isError) {
          stats.tool_errors++;
        } else if (rcStr.toLowerCase().slice(0, 150)
          .includes('error')) {
          stats.tool_errors++;
        }
        if (isQuotaEvent(rcStr)) stats.quota_pauses++;
      }
    }

    // Ralph loop detection (first few lines)
    if (lineCount < 5) {
      if (
        obj['type'] === 'queue-operation' &&
        obj['operation'] === 'enqueue'
      ) {
        const qContent = String(obj['content'] ?? '');
        if (RALPH_LOOP_PATTERNS.some((p) => p.test(qContent))) {
          stats.session_type = 'ralph_loop';
          stats.task_summary = qContent.slice(0, 200).trim();

          // Try to extract issue ID from the task prompt
          const issueId = extractIssueId(qContent);
          if (issueId && !stats.issue_identifier) {
            stats.issue_identifier = issueId;
          }
        }
      }
    }

    // Also try to extract issue ID from user messages
    if (role === 'user' && lineCount < 10) {
      const msgContent = typeof obj['content'] === 'string'
        ? obj['content']
        : '';
      const issueId = extractIssueId(msgContent as string);
      if (issueId && !stats.issue_identifier) {
        stats.issue_identifier = issueId;
      }
    }

    lineCount++;
  }
}

function finalizeTimestamps(stats: SessionStats, timestamps: Date[]): void {
  if (timestamps.length > 0) {
    const min = new Date(Math.min(...timestamps.map((t) => t.getTime())));
    const max = new Date(Math.max(...timestamps.map((t) => t.getTime())));
    stats.first_ts = min.toISOString();
    stats.last_ts = max.toISOString();
    stats.duration_minutes = Math.round(((max.getTime() - min.getTime()) / 60000) * 10) / 10;
  }
}

// ─────────────────────────────────────────────
//  CLAUDE SESSION COLLECTION
// ─────────────────────────────────────────────

async function collectClaudeSessions(
  sessionDir: string,
  since: Date | null,
  existingSessionIds: Set<string>,
  verbose: boolean,
): Promise<SessionStats[]> {
  const results: SessionStats[] = [];

  if (!fs.existsSync(sessionDir)) {
    console.error(`Session dir not found: ${sessionDir}`);
    return results;
  }

  const entries = fs.readdirSync(sessionDir, { withFileTypes: true });

  // Layout A: loose .jsonl files (ralph loop sessions)
  const looseJsonl = entries
    .filter((e) => !e.isDirectory() && e.name.endsWith('.jsonl'))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of looseJsonl) {
    const sessionId = entry.name.replace('.jsonl', '');
    if (existingSessionIds.has(sessionId)) {
      if (verbose) console.log(`  skip (exists): ${sessionId}`);
      continue;
    }

    const stats = makeEmptyStats(sessionId);
    stats.layout = 'loose_file';
    const timestamps: Date[] = [];

    await ingestJsonl(path.join(sessionDir, entry.name), stats, timestamps, since);

    // Check for .meta.json
    const metaPath = path.join(sessionDir, `${sessionId}.meta.json`);
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        for (const key of ['createdAt', 'created_at', 'startedAt', 'updatedAt', 'lastUpdated']) {
          const val = meta[key];
          if (val) {
            try {
              const ts = new Date(String(val).replace('Z', '+00:00'));
              if (!isNaN(ts.getTime())) timestamps.push(ts);
            } catch { /* skip */ }
          }
        }
        // Try to extract issue from meta title/summary
        const metaTitle = meta['title'] ?? meta['summary'] ?? '';
        const issueId = extractIssueId(String(metaTitle));
        if (issueId && !stats.issue_identifier) {
          stats.issue_identifier = issueId;
        }
      } catch { /* skip bad meta */ }
    }

    finalizeTimestamps(stats, timestamps);
    if (stats.event_count > 0) {
      results.push(stats);
      if (verbose) console.log(`  collected: ${sessionId} (${stats.event_count} events, ${stats.input_tokens + stats.output_tokens} tokens)`);
    }
  }

  // Layout B: UUID subdirs (regular sessions)
  const uuidDirs = entries
    .filter((e) => e.isDirectory() && e.name !== 'node_modules')
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const dirEntry of uuidDirs) {
    const sessionId = dirEntry.name;
    if (existingSessionIds.has(sessionId)) {
      if (verbose) console.log(`  skip (exists): ${sessionId}`);
      continue;
    }

    const sessionPath = path.join(sessionDir, dirEntry.name);
    const stats = makeEmptyStats(sessionId);
    stats.layout = 'uuid_dir';
    stats.session_type = 'regular';
    const timestamps: Date[] = [];

    // Parse meta files
    for (const metaFile of fs.readdirSync(sessionPath).filter((f) => f.endsWith('.meta.json'))) {
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(sessionPath, metaFile), 'utf-8'));
        for (const key of ['createdAt', 'created_at', 'startedAt', 'updatedAt', 'lastUpdated']) {
          const val = meta[key];
          if (val) {
            try {
              const ts = new Date(String(val).replace('Z', '+00:00'));
              if (!isNaN(ts.getTime())) timestamps.push(ts);
            } catch { /* skip */ }
          }
        }
        const metaTitle = meta['title'] ?? meta['summary'] ?? '';
        const issueId = extractIssueId(String(metaTitle));
        if (issueId && !stats.issue_identifier) {
          stats.issue_identifier = issueId;
        }
      } catch { /* skip */ }
    }

    // Parse JSONL files
    for (const jsonlFile of fs.readdirSync(sessionPath).filter((f) => f.endsWith('.jsonl'))) {
      await ingestJsonl(path.join(sessionPath, jsonlFile), stats, timestamps, since);
    }

    // Parse subagent JSONL
    const subagentsDir = path.join(sessionPath, 'subagents');
    if (fs.existsSync(subagentsDir)) {
      const agentFiles = fs.readdirSync(subagentsDir).filter((f) => f.startsWith('agent-') && f.endsWith('.jsonl'));
      stats.subagent_count = agentFiles.length;
      for (const af of agentFiles) {
        await ingestJsonl(path.join(subagentsDir, af), stats, timestamps, since);
      }
    }

    // Check tool-result dir for quota pauses
    const toolResultDir = path.join(sessionPath, 'tool-result');
    if (fs.existsSync(toolResultDir)) {
      for (const tf of fs.readdirSync(toolResultDir).filter((f) => f.startsWith('toolu_'))) {
        try {
          const content = fs.readFileSync(path.join(toolResultDir, tf), 'utf-8').slice(0, 2000);
          if (isQuotaEvent(content)) stats.quota_pauses++;
        } catch { /* skip */ }
      }
    }

    finalizeTimestamps(stats, timestamps);
    if (stats.event_count > 0) {
      results.push(stats);
      if (verbose) console.log(`  collected: ${sessionId} (${stats.event_count} events, ${stats.input_tokens + stats.output_tokens} tokens)`);
    }
  }

  return results;
}

// ─────────────────────────────────────────────
//  GIT COLLECTION
// ─────────────────────────────────────────────

interface CommitData {
  sha: string;
  timestamp: string;
  subject: string;
  author: string;
  email: string;
  branch: string | null;
  issue_identifier: string | null;
  files_changed: number;
  insertions: number;
  deletions: number;
  files_json: string;
  minutes_since_prev: number | null;
  possible_quota_pause: boolean;
}

function collectGitCommits(
  repoPath: string,
  since: Date | null,
  existingShas: Set<string>,
  verbose: boolean,
): CommitData[] {
  const gitDir = path.join(repoPath, '.git');
  if (!fs.existsSync(gitDir)) {
    console.error(`No .git directory at ${repoPath}`);
    return [];
  }

  const sinceArg = since
    ? [`--since=${since.toISOString().split('T')[0]}`]
    : [];
  const logFormat = '%H%x1f%aI%x1f%s%x1f%an%x1f%ae%x1f%D';

  let raw: string;
  try {
    raw = execSync(
      ['git', '-C', repoPath, 'log', `--format=${logFormat}`, ...sinceArg].join(' '),
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 },
    ).trim();
  } catch (e) {
    console.error(`git log failed: ${e}`);
    return [];
  }

  if (!raw) return [];

  const commits: CommitData[] = [];

  for (const line of raw.split('\n')) {
    const parts = line.split('\x1f');
    if (parts.length < 5) continue;

    const [sha, tsStr, subject, author, email, refs] = parts;
    if (!sha || existingShas.has(sha.slice(0, 12))) {
      if (verbose) console.log(`  skip (exists): ${sha?.slice(0, 8)}`);
      continue;
    }

    // Extract branch from refs (e.g., "HEAD -> feature/OPT-221, origin/feature/OPT-221")
    let branch: string | null = null;
    if (refs) {
      const branchMatch = refs.match(/(?:origin\/|HEAD -> )?(feature\/OPT-\d+|claude\/[\w-]+)/);
      if (branchMatch) branch = branchMatch[1] ?? null;
    }

    // Extract issue ID from subject or branch
    const issueFromSubject = extractIssueId(subject ?? '');
    const issueFromBranch = branch
      ? extractIssueId(branch)
      : null;
    const issueIdentifier = issueFromSubject ?? issueFromBranch;

    // Get file stats
    let filesChanged = 0;
    let insertions = 0;
    let deletions = 0;
    const files: {
      created: string[];
      modified: string[];
      deleted: string[];
      renamed: string[];
    } = { created: [], modified: [], deleted: [], renamed: [] };

    try {
      const nsOut = execSync(
        `git -C "${repoPath}" diff-tree --no-commit-id -r --name-status ${sha}`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
      ).trim();

      for (const nsLine of nsOut.split('\n')) {
        if (!nsLine) continue;
        const nsParts = nsLine.split('\t');
        const status = nsParts[0]?.[0] ?? '';
        const fname = nsParts[nsParts.length - 1] ?? '';
        if (status === 'A') files.created.push(fname);
        else if (status === 'M') files.modified.push(fname);
        else if (status === 'D') files.deleted.push(fname);
        else if (status === 'R') files.renamed.push(fname);
      }

      filesChanged = files.created.length + files.modified.length + files.deleted.length + files.renamed.length;

      const numOut = execSync(
        `git -C "${repoPath}" diff-tree --no-commit-id -r --numstat ${sha}`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
      ).trim();

      for (const numLine of numOut.split('\n')) {
        const numParts = numLine.split('\t');
        if (numParts.length >= 2) {
          if (numParts[0] !== '-') insertions += parseInt(numParts[0] ?? '0', 10) || 0;
          if (numParts[1] !== '-') deletions += parseInt(numParts[1] ?? '0', 10) || 0;
        }
      }
    } catch {
      /* skip file stats on error */
    }

    commits.push({
      sha: sha!.slice(0, 12),
      timestamp: new Date(tsStr!).toISOString(),
      subject: subject ?? '',
      author: author ?? '',
      email: email ?? '',
      branch,
      issue_identifier: issueIdentifier,
      files_changed: filesChanged,
      insertions,
      deletions,
      files_json: JSON.stringify(files),
      minutes_since_prev: null,
      possible_quota_pause: false,
    });
  }

  // Calculate inter-commit timing
  for (let i = 0; i < commits.length - 1; i++) {
    const curr = new Date(commits[i]!.timestamp).getTime();
    const next = new Date(commits[i + 1]!.timestamp).getTime();
    const gapMin = (curr - next) / 60000;
    commits[i]!.minutes_since_prev = Math.round(gapMin * 10) / 10;
    commits[i]!.possible_quota_pause = gapMin > 30;
  }

  return commits;
}

// ─────────────────────────────────────────────
//  BRANCH → ISSUE MAPPING
// ─────────────────────────────────────────────

function collectBranchIssues(repoPath: string): Map<string, { branch: string; identifier: string }> {
  const issues = new Map<string, { branch: string; identifier: string }>();

  try {
    const branches = execSync(
      `git -C "${repoPath}" branch -a --format='%(refname:short)'`,
      { encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 },
    ).trim();

    for (const branch of branches.split('\n')) {
      const issueId = extractIssueId(branch);
      if (issueId) {
        // Prefer local branch name over origin/ prefix
        const cleanBranch = branch.replace(/^origin\//, '');
        if (!issues.has(issueId) || !cleanBranch.startsWith('origin/')) {
          issues.set(issueId, { branch: cleanBranch, identifier: issueId });
        }
      }
    }
  } catch {
    /* skip */
  }

  return issues;
}

/**
 * Build a map of commit SHA → issue identifier by walking merge commits.
 *
 * Strategy: on the main/default branch, merge commits reference the PR branch
 * (e.g. "Merge pull request #48 from bifemecanico/feature/OPT-221"). All
 * commits reachable from the second parent but not the first parent belong
 * to that issue. The "chore: remove task files after merge" commits by
 * github-actions also mark merge boundaries.
 */
function buildMergeIssueMap(repoPath: string, verbose: boolean): Map<string, string> {
  const shaToIssue = new Map<string, string>();

  try {
    // Get all merge commits on main (first-parent only)
    const raw = execSync(
      `git -C "${repoPath}" log --first-parent main --merges --format=%H%x1f%s`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 },
    ).trim();

    if (!raw) return shaToIssue;

    for (const line of raw.split('\n')) {
      const [mergeSha, subject] = line.split('\x1f');
      if (!mergeSha || !subject) continue;

      const issueId = extractIssueId(subject);
      if (!issueId) continue;

      // Map the merge commit itself
      shaToIssue.set(mergeSha.slice(0, 12), issueId);

      // Find all commits introduced by this merge (branch commits)
      try {
        const branchCommits = execSync(
          `git -C "${repoPath}" log --format=%H ${mergeSha}^1..${mergeSha}^2`,
          { encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] },
        ).trim();

        if (branchCommits) {
          for (const sha of branchCommits.split('\n')) {
            if (sha.trim()) {
              shaToIssue.set(sha.trim().slice(0, 12), issueId);
            }
          }
        }
      } catch {
        // Some merges may not have two parents (squash merges, etc.)
      }
    }

    if (verbose) console.log(`  merge-based issue map: ${shaToIssue.size} commits mapped`);
  } catch (e) {
    if (verbose) console.warn(`  merge issue map failed: ${e}`);
  }

  // Also map "chore: remove task files after merge" commits to the nearest
  // preceding merge's issue (they come right after the merge on main)
  try {
    const firstParent = execSync(
      `git -C "${repoPath}" log --first-parent main --format=%H%x1f%s`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 },
    ).trim();

    let lastIssue: string | null = null;
    // Iterate newest to oldest
    for (const line of firstParent.split('\n')) {
      const [sha, subject] = line.split('\x1f');
      if (!sha || !subject) continue;
      const short = sha.slice(0, 12);

      // If this is a merge commit with an issue, remember it
      const mergeIssue = extractIssueId(subject);
      if (subject.startsWith('Merge pull request') && mergeIssue) {
        lastIssue = mergeIssue;
        shaToIssue.set(short, lastIssue);
        continue;
      }

      // "chore: remove task files after merge" by github-actions
      // These appear right BEFORE the merge commit in first-parent order (newer first)
      // Actually they appear AFTER (more recent), so we need previous issue
      if (subject.includes('remove task files after merge') && lastIssue) {
        shaToIssue.set(short, lastIssue);
      }

      // Reset tracking if we hit a non-related commit
      if (mergeIssue) lastIssue = mergeIssue;
    }
  } catch {
    /* skip */
  }

  return shaToIssue;
}

/**
 * Try to match sessions to issues by looking at the session's task_summary,
 * files touched, and timing alignment with commits.
 */
function inferSessionIssue(
  session: SessionStats,
  branchIssues: Map<string, { branch: string }>,
): string | null {
  // Already has an issue from content parsing
  if (session.issue_identifier) return session.issue_identifier;

  // Check files touched for issue IDs in paths
  for (const file of session.files_touched) {
    const issueId = extractIssueId(file);
    if (issueId && branchIssues.has(issueId)) return issueId;
  }

  // Check task summary
  if (session.task_summary) {
    const issueId = extractIssueId(session.task_summary);
    if (issueId) return issueId;
  }

  return null;
}

// ─────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────

export default async function effortCollect(args: string[]): Promise<void> {
  const flags = {
    since: null as string | null,
    noClaude: false,
    noGit: false,
    verbose: false,
    dryRun: false,
  };

  // Parse args
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--since':
        flags.since = args[++i] ?? null;
        break;
      case '--no-claude':
        flags.noClaude = true;
        break;
      case '--no-git':
        flags.noGit = true;
        break;
      case '--verbose':
      case '-v':
        flags.verbose = true;
        break;
      case '--dry-run':
        flags.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: tomato ralph effort-collect [options]

Options:
  --since <date>   Only collect events after this ISO date (e.g. 2025-01-01)
  --no-claude      Skip Claude Code session collection
  --no-git         Skip git commit collection
  --verbose, -v    Show detailed progress
  --dry-run        Parse data but don't write to DB
  --help, -h       Show this help
`);
        return;
    }
  }

  const repoRoot = getRepoRoot();
  const since = flags.since
    ? new Date(flags.since)
    : null;

  console.log('Effort Collector');
  console.log(`  repo: ${repoRoot}`);
  if (since) console.log(`  since: ${since.toISOString().split('T')[0]}`);

  const db = openDb(repoRoot);
  const runId = startCollectionRun(db, flags.noClaude
    ? 'git'
    : flags.noGit
      ? 'claude'
      : 'full');

  let sessionsAdded = 0;
  let commitsAdded = 0;

  try {
    // ── Collect branch → issue mapping ──
    const branchIssues = collectBranchIssues(repoRoot);
    console.log(`  found ${branchIssues.size} issue branches`);

    // Register all branch-based issues
    for (const [identifier, info] of branchIssues) {
      upsertIssue(db, { identifier, branch: info.branch });
    }

    // ── Claude sessions ──
    if (!flags.noClaude) {
      const sessionDir = findClaudeSessionDir(repoRoot);
      if (!sessionDir) {
        console.warn('  Claude session dir not found — skipping');
      } else {
        console.log(`\n[1/2] Claude sessions from:\n      ${sessionDir}`);

        // Get existing session IDs for idempotency
        const existingRows = db
          .query('SELECT session_id FROM sessions')
          .all() as { session_id: string }[];
        const existingIds = new Set(existingRows.map((r) => r.session_id));
        console.log(`  ${existingIds.size} sessions already in DB`);

        const sessions = await collectClaudeSessions(sessionDir, since, existingIds, flags.verbose);

        for (const session of sessions) {
          // Try to infer issue from content
          session.issue_identifier = inferSessionIssue(session, branchIssues);

          // Ensure the issue exists in DB
          if (session.issue_identifier) {
            const branchInfo = branchIssues.get(session.issue_identifier);
            upsertIssue(db, {
              identifier: session.issue_identifier,
              branch: branchInfo?.branch,
            });
          }

          if (!flags.dryRun) {
            const inserted = insertSession(db, {
              session_id: session.session_id,
              issue_identifier: session.issue_identifier ?? undefined,
              layout: session.layout,
              session_type: session.session_type,
              task_summary: session.task_summary ?? undefined,
              model: session.model ?? undefined,
              first_ts: session.first_ts ?? undefined,
              last_ts: session.last_ts ?? undefined,
              duration_minutes: session.duration_minutes ?? undefined,
              event_count: session.event_count,
              assistant_turns: session.assistant_turns,
              user_turns: session.user_turns,
              input_tokens: session.input_tokens,
              output_tokens: session.output_tokens,
              cache_read_tokens: session.cache_read_tokens,
              cache_write_tokens: session.cache_write_tokens,
              cost_usd: session.cost_usd,
              tool_calls_total: Object.values(session.tool_calls).reduce((a, b) => a + b, 0),
              tool_errors: session.tool_errors,
              quota_pauses: session.quota_pauses,
              subagent_count: session.subagent_count,
              tool_calls_json: JSON.stringify(session.tool_calls),
              files_touched_json: JSON.stringify([...session.files_touched]),
            });
            if (inserted) sessionsAdded++;
          } else {
            sessionsAdded++;
          }
        }

        const ralph = sessions.filter((s) => s.session_type === 'ralph_loop').length;
        console.log(`  -> ${ralph} ralph loop, ${sessions.length - ralph} regular (${sessions.length} total, ${sessionsAdded} new)`);
      }
    }

    // ── Git commits ──
    if (!flags.noGit) {
      console.log(`\n[2/2] Git commits from:\n      ${repoRoot}`);

      // Build merge-based issue map for retroactive linking
      const mergeIssueMap = buildMergeIssueMap(repoRoot, flags.verbose);

      const existingRows = db
        .query('SELECT sha FROM commits')
        .all() as { sha: string }[];
      const existingShas = new Set(existingRows.map((r) => r.sha));
      console.log(`  ${existingShas.size} commits already in DB`);

      const commits = collectGitCommits(repoRoot, since, existingShas, flags.verbose);

      for (const commit of commits) {
        // Use merge-based issue map as fallback for unlinked commits
        if (!commit.issue_identifier) {
          const mergeIssue = mergeIssueMap.get(commit.sha);
          if (mergeIssue) commit.issue_identifier = mergeIssue;
        }

        // Ensure the issue exists in DB
        if (commit.issue_identifier) {
          const branchInfo = branchIssues.get(commit.issue_identifier);
          upsertIssue(db, {
            identifier: commit.issue_identifier,
            branch: branchInfo?.branch ?? commit.branch ?? undefined,
          });
        }

        if (!flags.dryRun) {
          const inserted = insertCommit(db, {
            ...commit,
            issue_identifier: commit.issue_identifier ?? undefined,
            branch: commit.branch ?? undefined,
            minutes_since_prev: commit.minutes_since_prev ?? undefined,
          });
          if (inserted) commitsAdded++;
        } else {
          commitsAdded++;
        }
      }

      console.log(`  -> ${commits.length} commits found, ${commitsAdded} new`);

      // Backfill: update existing commits that have no issue but are now in the merge map
      let backfilled = 0;
      const unlinkeds = db
        .query('SELECT sha FROM commits WHERE issue_identifier IS NULL')
        .all() as { sha: string }[];
      for (const { sha } of unlinkeds) {
        const issue = mergeIssueMap.get(sha);
        if (issue) {
          db.run('UPDATE commits SET issue_identifier = ? WHERE sha = ?', [issue, sha]);
          backfilled++;
        }
      }
      if (backfilled > 0) {
        console.log(`  -> backfilled ${backfilled} existing commits with issue links`);
      }
    }

    finishCollectionRun(db, runId, { sessions_added: sessionsAdded, commits_added: commitsAdded });

    // ── Summary ──
    console.log('\n── COLLECTION COMPLETE ──');
    console.log(`  Sessions added: ${sessionsAdded}`);
    console.log(`  Commits added:  ${commitsAdded}`);
    if (flags.dryRun) console.log('  (dry run — nothing written to DB)');

  } catch (err) {
    const errMsg = err instanceof Error
      ? err.message
      : String(err);
    finishCollectionRun(db, runId, { sessions_added: sessionsAdded, commits_added: commitsAdded, error: errMsg });
    console.error(`\nError: ${errMsg}`);
    process.exit(1);
  } finally {
    db.close();
  }
}
