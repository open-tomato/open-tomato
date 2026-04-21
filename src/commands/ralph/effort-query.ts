#!/usr/bin/env bun
/**
 * effort-query.ts — Query effort data from SQLite and output as JSON.
 *
 * Used by the dashboard app to pull data without a live server.
 * Outputs to stdout or a file that the dashboard can fetch.
 *
 * Usage:
 *   tomato ralph effort-query [--output ./apps/dashboard/public/effort.json]
 *   tomato ralph effort-query --issue OPT-221
 */

import fs from 'fs';
import path from 'path';

import {
  openDb,
  getEffortSummary,
  getIssueEfforts,
  getDailyEffort,
  getDailyEfficiency,
  getIssueComplexity,
  getSessionsByIssue,
} from './utils/effort-db.js';
import { getRepoRoot } from './utils/git.js';

export default async function effortQuery(args: string[]): Promise<void> {
  const flags = {
    output: null as string | null,
    issue: null as string | null,
    format: 'json' as 'json' | 'table',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--output':
      case '-o':
        flags.output = args[++i] ?? null;
        break;
      case '--issue':
        flags.issue = args[++i]?.toUpperCase() ?? null;
        break;
      case '--table':
        flags.format = 'table';
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: tomato ralph effort-query [options]

Options:
  --output, -o <path>  Write JSON to file (default: stdout)
  --issue <OPT-XXX>    Show detail for a specific issue
  --table              Print as formatted table instead of JSON
  --help, -h           Show this help
`);
        return;
    }
  }

  const repoRoot = getRepoRoot();
  const db = openDb(repoRoot);

  try {
    if (flags.issue) {
      const sessions = getSessionsByIssue(db, flags.issue);
      const data = { issue: flags.issue, sessions };
      output(data, flags.output);
      return;
    }

    const summary = getEffortSummary(db);
    const issues = getIssueEfforts(db);
    const timeSeries = getDailyEffort(db);
    const efficiency = getDailyEfficiency(db);
    const complexity = getIssueComplexity(db);

    const data = {
      generated_at: new Date().toISOString(),
      summary,
      issues,
      timeSeries,
      efficiency,
      complexity,
    };

    if (flags.format === 'table') {
      printTable(summary, issues);
    } else {
      output(data, flags.output);
    }
  } finally {
    db.close();
  }
}

function output(data: unknown, filePath: string | null): void {
  const json = JSON.stringify(data, null, 2);
  if (filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, json, 'utf-8');
    console.log(`Written to ${filePath}`);
  } else {
    console.log(json);
  }
}

function printTable(
  summary: ReturnType<typeof getEffortSummary>,
  issues: ReturnType<typeof getIssueEfforts>,
): void {
  console.log('\n── EFFORT SUMMARY ──────────────────────────');
  console.log(`  Issues:          ${summary.issue_count}`);
  console.log(`  Sessions:        ${summary.total_sessions}`);
  console.log(`  Commits:         ${summary.total_commits}`);
  console.log(`  Input tokens:    ${summary.total_input_tokens.toLocaleString()}`);
  console.log(`  Output tokens:   ${summary.total_output_tokens.toLocaleString()}`);
  console.log(`  Cost (USD):      $${summary.total_cost_usd.toFixed(4)}`);
  console.log(`  Duration (min):  ${summary.total_duration_minutes.toFixed(1)}`);
  console.log(`  Tool calls:      ${summary.total_tool_calls}`);
  console.log(`  Tool errors:     ${summary.total_tool_errors}`);
  console.log(`  Lines changed:   +${summary.total_insertions} / -${summary.total_deletions}`);

  if (issues.length > 0) {
    console.log('\n── PER-ISSUE BREAKDOWN ─────────────────────');
    console.log(
      '  ' +
        'Issue'.padEnd(12) +
        'Sessions'.padEnd(10) +
        'Commits'.padEnd(10) +
        'In Tokens'.padEnd(14) +
        'Out Tokens'.padEnd(14) +
        'Cost'.padEnd(10) +
        'Lines',
    );
    console.log('  ' + '─'.repeat(72));

    for (const issue of issues) {
      console.log(
        '  ' +
          issue.identifier.padEnd(12) +
          String(issue.session_count).padEnd(10) +
          String(issue.commit_count).padEnd(10) +
          issue.total_input_tokens.toLocaleString().padEnd(14) +
          issue.total_output_tokens.toLocaleString().padEnd(14) +
          `$${issue.total_cost_usd.toFixed(2)}`.padEnd(10) +
          `+${issue.total_insertions}/-${issue.total_deletions}`,
      );
    }
  }

  console.log('\n────────────────────────────────────────────\n');
}
