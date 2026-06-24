#!/usr/bin/env bun

import path from 'path';

import { LinearClient } from '@linear/sdk';
import { loadAccessToken } from '@open-tomato/linear/auth-node';

import { checkUsage, runRalphStart } from './utils/claude.js';
import { getRepoRoot, getMainCommitHash, checkoutBranch } from './utils/git.js';
import { checkForCheckoutConflict, waitForMerge } from './utils/prompt.js';
import { loadState, saveState, type IssueEntry, type RoadmapState } from './utils/roadmap.js';

const REPO = 'bifemecanico/open-tomato';
const ROADMAP_FILE = path.join('.tmp', 'current-roadmap.json');
const PLAN_TO_BRANCH_URL = 'https://dev.bifemecanico.com/webhook/plan-to-branch';
const WEBHOOK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ─── Linear ───────────────────────────────────────────────────────────────────

async function fetchIssueIds(identifiers: string[], token: string): Promise<Map<string, string>> {
  const client = new LinearClient({ accessToken: token });

  // Group by team key so we can do one query per team.
  const byTeam = new Map<string, number[]>();
  for (const id of identifiers) {
    const parts = id.split('-');
    const teamKey = parts.slice(0, -1).join('-');
    const num = Number(parts[parts.length - 1]);
    const existing = byTeam.get(teamKey);
    if (existing) {
      existing.push(num);
    } else {
      byTeam.set(teamKey, [num]);
    }
  }

  const result = new Map<string, string>();
  for (const [teamKey, numbers] of byTeam) {
    const response = await client.issues({
      includeArchived: true,
      filter: {
        number: { in: numbers },
        team: { key: { eq: teamKey } },
      },
    });
    for (const issue of response.nodes) {
      result.set(issue.identifier, issue.id);
    }
  }
  return result;
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

interface PlanToBranchResponse {
  success: boolean;
  status: string;
  branch?: string;
  issue_id?: string;
  issue_title?: string;
  plan_url?: string;
  prerequisites_url?: string;
}

async function callPlanToBranch(issueId: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(PLAN_TO_BRANCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: REPO, issueId }),
      signal: controller.signal,
      // Dev server uses a self-signed certificate (Bun-specific TLS option)
      tls: { rejectUnauthorized: false },
    });

    const raw = await response.text();
    let body: PlanToBranchResponse;
    try {
      const parsed = JSON.parse(raw) as PlanToBranchResponse[];
      body = parsed[0]!;
    } catch {
      throw new Error(`Non-JSON response from webhook: ${raw}`);
    }

    if (body.status !== 'PLAN_CREATED') {
      throw new Error(`Webhook returned unexpected status "${body.status}" for issue ${issueId}`);
    }

    if (!body.branch) {
      throw new Error(`Webhook status is PLAN_CREATED but no branch was returned for issue ${issueId}`);
    }

    return body.branch;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Interrupt handling ───────────────────────────────────────────────────────

let _stateFilePath = '';
let _currentIdx = -1;
let _interrupted = false;

function markCurrentBlocked(): void {
  if (!_stateFilePath || _currentIdx < 0) return;
  try {
    const state = loadState(_stateFilePath);
    const entry = state.issues[_currentIdx];
    if (entry && entry.status !== 'done') {
      entry.status = 'blocked';
      saveState(_stateFilePath, state);
      console.log(`\nIssue ${entry.identifier} marked as blocked in ${ROADMAP_FILE}.`);
    }
  } catch (err) {
    console.error('Failed to update roadmap state on interrupt:', err);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default async function hyperloop(args: string[]): Promise<void> {
  const repoRoot = getRepoRoot();
  const roadmapPath = path.join(repoRoot, ROADMAP_FILE);
  const cliPath = path.join(repoRoot, 'scripts', 'cli.ts');

  _stateFilePath = roadmapPath;

  // Parse --roadmap identifiers, handling shell splitting on spaces after commas.
  const roadmapIdx = args.findIndex((a) => a.startsWith('--roadmap=') || a === '--roadmap');
  const identifiers: string[] = [];
  if (roadmapIdx >= 0) {
    const flag = args[roadmapIdx]!;
    const inlineValue = flag.startsWith('--roadmap=')
      ? flag.slice('--roadmap='.length)
      : '';
    const extra = args
      .slice(roadmapIdx + (flag === '--roadmap'
        ? 2
        : 1))
      .filter((a) => !a.startsWith('-'));
    [inlineValue, ...extra]
      .flatMap((s) => s.split(','))
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((id) => identifiers.push(id));
  }

  let state: RoadmapState;

  if (roadmapIdx >= 0) {
    // ── Fresh run ──────────────────────────────────────────────────────────
    if (identifiers.length === 0) {
      console.error('--roadmap must contain at least one issue identifier (e.g. OPT-001).');
      process.exit(1);
    }

    console.log(`Fetching issue IDs from Linear for: ${identifiers.join(', ')}...`);
    const token = await loadAccessToken();
    const idMap = await fetchIssueIds(identifiers, token);

    const issues: IssueEntry[] = identifiers.map((identifier) => ({
      identifier,
      issueId: idMap.get(identifier) ?? '',
      status: 'pending' as const,
    }));

    const missing = issues.filter((i) => !i.issueId).map((i) => i.identifier);
    if (missing.length > 0) {
      console.error(`Could not resolve Linear IDs for: ${missing.join(', ')}`);
      process.exit(1);
    }

    state = { issues, currentIndex: 0 };
    saveState(roadmapPath, state);
    console.log(`Roadmap saved to ${ROADMAP_FILE}.\n`);
  } else {
    // ── Resume run ─────────────────────────────────────────────────────────
    const fs = await import('fs');
    if (!fs.existsSync(roadmapPath)) {
      console.error('No --roadmap argument provided and no existing roadmap found.');
      console.error(`Expected: ${ROADMAP_FILE}`);
      console.error('Usage: ralph hyperloop --roadmap=OPT-001,OPT-002');
      process.exit(1);
    }

    state = loadState(roadmapPath);

    const blockedIdx = state.issues.findIndex((i) => i.status === 'blocked');
    if (blockedIdx >= 0) {
      state.issues[blockedIdx]!.status = 'pending';
      state.currentIndex = blockedIdx;
      saveState(roadmapPath, state);
      console.log(`Resuming from blocked issue: ${state.issues[blockedIdx]!.identifier}\n`);
    } else {
      const pending = state.issues.findIndex((i) => i.status === 'pending');
      if (pending < 0) {
        console.log('All issues in the roadmap are already done.');
        return;
      }
      state.currentIndex = pending;
      saveState(roadmapPath, state);
      console.log(`Resuming roadmap at ${state.issues[pending]!.identifier} (${pending + 1}/${state.issues.length}).\n`);
    }
  }

  process.on('SIGINT', () => {
    _interrupted = true;
    markCurrentBlocked();
    process.exit(0);
  });

  // ── Main loop ──────────────────────────────────────────────────────────────
  while (state.currentIndex < state.issues.length) {
    if (_interrupted) break;

    const entry = state.issues[state.currentIndex]!;

    if (entry.status === 'done') {
      state.currentIndex++;
      saveState(roadmapPath, state);
      continue;
    }

    _currentIdx = state.currentIndex;
    console.log(`[${state.currentIndex + 1}/${state.issues.length}] Processing ${entry.identifier}`);

    await checkUsage('issue');

    try {
      // Step 1: Create branch with plan files via webhook
      const isNewBranch = !entry.branch;
      if (isNewBranch) {
        console.log(`Requesting plan branch for ${entry.identifier} (this may take several minutes)...`);
        const branch = await callPlanToBranch(entry.issueId);
        entry.branch = branch;
        entry.mainRef = getMainCommitHash();
        saveState(roadmapPath, state);
        console.log(`Branch ready: ${branch}`);
      } else {
        console.log(`Using existing branch: ${entry.branch}`);
      }

      // Step 2: Checkout the plan branch — only when starting fresh.
      if (isNewBranch) {
        checkoutBranch(entry.branch!);
      }

      // Step 2.5: Detect and handle merge conflicts.
      const shouldAbortConflict = await checkForCheckoutConflict(entry.branch!);
      if (shouldAbortConflict) {
        entry.status = 'blocked';
        saveState(roadmapPath, state);
        console.log(`Issue ${entry.identifier} marked as blocked due to unresolved conflicts. Run again after resolving.`);
        return;
      }

      // Step 3: Run the ralph loop
      console.log(`\nStarting ralph loop for ${entry.identifier}...`);
      const exitCode = await runRalphStart(cliPath);

      if (_interrupted) {
        entry.status = 'blocked';
        saveState(roadmapPath, state);
        break;
      }

      if (exitCode !== 0) {
        entry.status = 'blocked';
        saveState(roadmapPath, state);
        throw new Error(`ralph start exited with code ${exitCode} for ${entry.identifier}`);
      }

      // Step 4: Switch back to main
      const { execSync } = await import('child_process');
      execSync('git checkout main', { stdio: 'inherit' });
      execSync('git pull', { stdio: 'inherit' });

      // Step 5: Mark issue done
      entry.status = 'done';
      saveState(roadmapPath, state);

      // Step 6: Wait for PR merge before advancing (skip after last issue)
      const isLast = state.currentIndex === state.issues.length - 1;
      if (!isLast) {
        await waitForMerge(entry.identifier, entry.branch!);
      }

      state.currentIndex++;
      saveState(roadmapPath, state);
    } catch (err) {
      if (entry.status !== 'blocked') {
        entry.status = 'blocked';
        saveState(roadmapPath, state);
      }
      throw err;
    }
  }

  if (!_interrupted) {
    console.log('\nAll issues in the roadmap have been processed.');
  }
}
