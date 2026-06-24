import https from 'https';
import { Buffer } from 'node:buffer';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createLinearService } from '@open-tomato/linear';
import { loadAccessToken } from '@open-tomato/linear/auth-node';
import inquirer from 'inquirer';

import { getRepoPath } from './utils/git';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getOwnerTeamName(): string {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as { owner?: string };
  if (!pkg.owner) throw new Error('No "owner" field found in package.json.');
  return pkg.owner;
}

type IssueCandidate = {
  teamId: string;
  projectId: string;
  projectName: string;
  projectDescription: string;
  issueId: string;
  issueIdentifier: string;
  issueTitle: string;
};

type WorkflowResponse = {
  success: boolean;
  status: string;
  issue_id?: string;
  uuid?: string;
  issue_title?: string;
  message?: string;
  files?: Record<string, string>;
  branch?: string;
  plan_url?: string;
  prerequisites_url?: string;
  repository?: string;
};

const BOOTSTRAP_TIMEOUT_MS = 5 * 60 * 1000;
const IS_DEV = process.env.NODE_ENV !== 'production';
const ACTIVE_PROJECT_STATES = new Set(['planned', 'started']);

async function findReadyIssues(linear: ReturnType<typeof createLinearService>): Promise<IssueCandidate[]> {
  const ownerName = getOwnerTeamName();
  const teams = await linear.getTeams();
  const team = teams.find((t) => t.name === ownerName);

  if (!team) {
    throw new Error(`Team "${ownerName}" not found in Linear workspace.`);
  }

  const projects = await linear.getSortedTeamProjects(team.id);
  const candidates: IssueCandidate[] = [];

  for (const { project, blockedByIds } of projects) {
    if (!ACTIVE_PROJECT_STATES.has(project.state)) continue;
    if (blockedByIds.length > 0) continue;

    const issues = await linear.getSortedProjectIssues(project.id);

    for (const { issue, blockedByIds: issueBlockers } of issues) {
      if (issueBlockers.length > 0) continue;

      const state = await issue.state;
      if (state?.type !== 'unstarted') continue;

      candidates.push({
        teamId: team.id,
        projectId: project.id,
        projectName: project.name,
        projectDescription: project.description ?? '',
        issueId: issue.id,
        issueIdentifier: issue.identifier,
        issueTitle: issue.title,
      });
    }
  }

  return candidates;
}

function displayIssueDetails(candidate: IssueCandidate): void {
  console.log('Issue');
  console.log('-----');
  console.log(`Identifier : ${candidate.issueIdentifier}`);
  console.log(`ID         : ${candidate.issueId}`);
  console.log(`Title      : ${candidate.issueTitle}`);
  console.log('');
  console.log('Project');
  console.log('-------');
  console.log(`Name       : ${candidate.projectName}`);
  if (candidate.projectDescription) {
    console.log(`Description: ${candidate.projectDescription}`);
  }
  console.log('');
}

async function confirmCandidate(candidate: IssueCandidate): Promise<boolean> {
  console.clear();
  displayIssueDetails(candidate);

  const { confirmed } = await inquirer.prompt({
    confirmed: {
      type: 'confirm',
      message: `Bootstrap "${candidate.issueIdentifier}: ${candidate.issueTitle}"?`,
      default: true,
    },
  });

  return confirmed as boolean;
}

async function callWorkflowApi(issueId: string): Promise<{ statusCode: number; body: WorkflowResponse }> {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ rejectUnauthorized: !IS_DEV });

    const req = https.request(
      {
        method: 'POST',
        hostname: 'dev.bifemecanico.com',
        path: '/webhook/issue-planner',
        // path: '/webhook/static-plan-builder',
        agent,
        headers: { 'Content-Type': 'application/json' },
        timeout: BOOTSTRAP_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');

          try {
            const parsed: unknown = JSON.parse(raw);
            const body = (Array.isArray(parsed)
              ? parsed[0]
              : parsed) as WorkflowResponse;
            resolve({ statusCode: res.statusCode ?? 0, body });
          } catch (error) {
            reject(new Error(`Non-JSON response: ${error instanceof Error
              ? error.message
              : String(error)}`));
          }
        });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out after ${BOOTSTRAP_TIMEOUT_MS / 1000}s.`));
    });

    req.on('error', reject);

    req.write(JSON.stringify({ repo: getRepoPath(), issueId }));
    req.end();
  });
}

type FileResult = { name: string; action: 'created' | 'replaced' | 'backed-up' };

const REPO_ROOT = resolve(__dirname, '../..');
const RESPONSE_FILES = ['PLAN.md', 'PREREQUISITES.md'] as const;

async function writeResponseFiles(files: Record<string, string>): Promise<FileResult[]> {
  const results: FileResult[] = [];

  for (const filename of RESPONSE_FILES) {
    const content = files[filename];
    if (!content?.trim()) continue;

    const filePath = resolve(REPO_ROOT, filename);

    if (!existsSync(filePath)) {
      writeFileSync(filePath, content, 'utf8');
      results.push({ name: filename, action: 'created' });
      continue;
    }

    const existing = readFileSync(filePath, 'utf8');
    if (!existing.trim()) {
      writeFileSync(filePath, content, 'utf8');
      results.push({ name: filename, action: 'replaced' });
      continue;
    }

    const { fileAction } = await inquirer.prompt({
      fileAction: {
        type: 'select',
        message: `${filename} already has content. Replace or create a backup?`,
        choices: [
          { name: 'Replace', value: 'replace' },
          { name: 'Create backup', value: 'backup' },
        ],
      },
    });

    if ((fileAction as string) === 'backup') {
      const ts = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
      renameSync(filePath, resolve(REPO_ROOT, `${filename}.${ts}.bak`));
      results.push({ name: filename, action: 'backed-up' });
    } else {
      results.push({ name: filename, action: 'replaced' });
    }

    writeFileSync(filePath, content, 'utf8');
  }

  return results;
}

const FILE_ACTION_LABEL: Record<FileResult['action'], string> = {
  'created': 'created',
  'replaced': 'replaced',
  'backed-up': 'backed up and replaced',
};

function formatPlanCreated(
  candidate: IssueCandidate,
  response: WorkflowResponse,
  fileResults: FileResult[],
): string {
  const lines = [
    'Plan created',
    '------------',
    `Issue  : ${candidate.issueIdentifier} – ${candidate.issueTitle}`,
  ];

  if (response.branch) {
    lines.push(`Branch : ${response.branch}`);
  }

  if (response.plan_url) {
    lines.push(`Plan   : ${response.plan_url}`);
  }

  if (response.prerequisites_url) {
    lines.push(`Prerequisites: ${response.prerequisites_url}`);
  }

  if (fileResults.length > 0) {
    lines.push('');
    lines.push('Files');
    lines.push('-----');
    for (const { name, action } of fileResults) {
      lines.push(`${name}: ${FILE_ACTION_LABEL[action]}`);
    }
  }

  if (response.branch) {
    lines.push('');
    lines.push('Next steps');
    lines.push('----------');
    lines.push('git checkout main && git pull');
    lines.push(`git checkout ${response.branch}`);
  }

  return lines.join('\n');
}

function describeErrorStatus(status: string, response: WorkflowResponse): string {
  switch (status) {
    case 'NO_AGENTS_CONTEXT':
      return `No agents context found for repository "${response.repository ?? 'unknown'}". Ensure the repository has agent configuration linked.`;
    case 'NO_LINK_RESOURCE':
      return `No repository link found for "${response.repository ?? 'unknown'}" on issue ${response.issue_id ?? 'unknown'}.`;
    case 'NO_ISSUES_FOUND':
      return `Issue ${response.issue_id ?? 'unknown'} was not found in Linear.`;
    case 'ERROR':
      return response.message ?? 'An unexpected server error occurred.';
    default:
      return `Unexpected status "${status}"${response.message
        ? `: ${response.message}`
        : '.'}`;
  }
}

export default async function run(): Promise<void> {
  const token = await loadAccessToken();
  const linear = createLinearService(token);
  const candidates = await findReadyIssues(linear);

  if (candidates.length === 0) {
    console.log(`No ready issues found for team "${getOwnerTeamName()}".`);
    return;
  }

  let index = 0;

  while (index < candidates.length) {
    const candidate = candidates[index] as IssueCandidate;

    const confirmed = await confirmCandidate(candidate);
    if (!confirmed) {
      console.clear();
      console.log('Cancelled.');
      return;
    }

    console.clear();
    console.log(`Sending ${candidate.issueIdentifier} to workflow API…`);

    const { statusCode, body } = await callWorkflowApi(candidate.issueId);

    console.clear();

    if (statusCode >= 200 && statusCode < 300) {
      if (body.status === 'PLAN_CREATED') {
        const fileResults = body.files
          ? await writeResponseFiles(body.files)
          : [];
        console.log(formatPlanCreated(candidate, body, fileResults));

        // Best-effort: dispatch a job to an available executor node.
        // Requires NOTIFICATION_URL env var; silently skips if absent or
        // if no idle nodes are registered.
        const notificationUrl = process.env['NOTIFICATION_URL'];
        if (notificationUrl && body.branch) {
          try {
            const dispatchRes = await fetch(`${notificationUrl}/dispatch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                branch: body.branch,
                planId: candidate.issueId,
              }),
            });
            if (dispatchRes.ok) {
              const dispatched = await dispatchRes.json() as { jobId?: string; nodeId?: string };
              console.log(`\nJob dispatched → node: ${dispatched.nodeId ?? '?'}, jobId: ${dispatched.jobId ?? '?'}`);
            } else if (dispatchRes.status === 503) {
              console.log('\nNo idle executor nodes available — skipping auto-dispatch.');
            }
          } catch {
            // network error — skip silently
          }
        }

        return;
      }

      if (body.status === 'NO_PLAN') {
        console.log(`No plan was generated for ${candidate.issueIdentifier}: ${candidate.issueTitle}.`);
        console.log('');

        const nextIndex = index + 1;
        if (nextIndex >= candidates.length) {
          console.log('No more issues available.');
          return;
        }

        const { useNext } = await inquirer.prompt({
          useNext: {
            type: 'confirm',
            message: 'Try the next available issue instead?',
            default: true,
          },
        });

        if (!(useNext as boolean)) {
          console.log('Done.');
          return;
        }

        index = nextIndex;
        continue;
      }
    }

    // 404, 500, or unknown — display human-readable reason and exit
    console.log(`Error: ${describeErrorStatus(body.status, body)}`);
  }

  console.log('No more issues available.');
}
