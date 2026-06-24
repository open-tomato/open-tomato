import type { Team } from '@linear/sdk';

import { writeFileSync, readFileSync, existsSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createLinearService,
  type IssueWithDependencies,
  type ProjectWithDependencies,
  callWorkflowApi,
  type WorkflowResponse,
} from '@open-tomato/linear';
import { loadAccessToken } from '@open-tomato/linear/auth-node';
import inquirer from 'inquirer';

import { getRepoPath } from './utils/git';

const EXIT = '__exit__';
const BACK = '__back__';
const NEXT_PRIORITY = '__next__';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatPriority(priority: number): string {
  return priority === 0
    ? 'P-'
    : `P${priority}`;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return 'n/a';
  const date = value instanceof Date
    ? value
    : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function formatColumnLabel(stateType: string): string {
  const labels: Record<string, string> = {
    unstarted: '[To Do]',
    backlog: '[Backlog]',
    started: '[In Progress]',
  };
  return labels[stateType] ?? `[${stateType}]`;
}

function formatIssueChoice(item: IssueWithDependencies): string {
  const blockedEmoji = item.blockedByIds.length > 0
    ? '🟥'
    : '🟩';
  const column = formatColumnLabel(item.stateType);
  const blockingSuffix = item.blockingIds.length > 0
    ? `  ⛓ ${item.blockingIds.length}`
    : '';
  return `${blockedEmoji} ${item.issue.identifier} ${formatPriority(item.issue.priority)} ${column} ${item.issue.title}${blockingSuffix}`;
}

// ─── Workflow helpers ─────────────────────────────────────────────────────────

const RESPONSE_FILES = ['PLAN.md', 'PREREQUISITES.md'] as const;

type FileResult = { name: string; action: 'created' | 'replaced' | 'backed-up' };

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

function describeErrorStatus(status: string, response: WorkflowResponse): string {
  switch (status) {
    case 'NO_AGENTS_CONTEXT':
      return `No agents context found for repository "${response.repository ?? 'unknown'}".`;
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

// ─── Prompts ──────────────────────────────────────────────────────────────────

async function promptForTeam(teams: Team[]): Promise<Team | null> {
  if (teams.length === 0) {
    console.log('No teams found in this Linear workspace.');
    return null;
  }

  const { teamId } = await inquirer.prompt({
    teamId: {
      type: 'select',
      message: 'Select a Linear team',
      pageSize: 20,
      choices: [
        ...teams.map((team) => ({
          name: `${team.name}${team.key
            ? ` (${team.key})`
            : ''}`,
          value: team.id,
        })),
        new inquirer.Separator(),
        { name: 'Exit', value: EXIT },
      ],
    },
  });

  return teamId === EXIT
    ? null
    : (teams.find((t) => t.id === teamId) ?? null);
}

async function promptForProject(
  teamName: string,
  projects: ProjectWithDependencies[],
): Promise<string | null> {
  if (projects.length === 0) {
    console.log(`No active projects found for ${teamName}.`);
    return null;
  }

  const { projectId } = await inquirer.prompt({
    projectId: {
      type: 'select',
      message: `Projects in ${teamName}`,
      pageSize: 20,
      choices: [
        { name: '→  Next priority issue', value: NEXT_PRIORITY },
        new inquirer.Separator(),
        ...projects.map(({ project, blockedByIds, blockingIds }) => ({
          name: `${blockedByIds.length > 0
            ? '🟥'
            : '🟩'} ${formatPriority(project.priority)} ${project.name}${blockingIds.length > 0
            ? `  ⛓ ${blockingIds.length}`
            : ''}`,
          value: project.id,
        })),
        new inquirer.Separator(),
        { name: 'Back to teams', value: BACK },
        { name: 'Exit', value: EXIT },
      ],
    },
  });

  if (projectId === EXIT) return EXIT;
  if (projectId === BACK) return null;
  return projectId as string;
}

async function promptForIssue(
  projectName: string,
  issues: IssueWithDependencies[],
): Promise<string | null> {
  if (issues.length === 0) {
    console.log(`No active issues found for ${projectName}.`);
    return null;
  }

  const { issueId } = await inquirer.prompt({
    issueId: {
      type: 'select',
      message: `Issues in ${projectName}`,
      pageSize: 20,
      choices: [
        ...issues.map((item) => ({
          name: formatIssueChoice(item),
          value: item.issue.id,
        })),
        new inquirer.Separator(),
        { name: 'Back to projects', value: BACK },
        { name: 'Exit', value: EXIT },
      ],
    },
  });

  if (issueId === EXIT) return EXIT;
  return issueId === BACK
    ? null
    : (issueId as string);
}

// ─── Actions ──────────────────────────────────────────────────────────────────

async function runCreatePlan(issueId: string, identifier: string, title: string): Promise<void> {
  console.clear();
  console.log(`Sending ${identifier} to workflow API…`);

  const { statusCode, body } = await callWorkflowApi(issueId, getRepoPath());
  console.clear();

  if (statusCode >= 200 && statusCode < 300 && body.status === 'PLAN_CREATED') {
    const fileResults = body.files
      ? await writeResponseFiles(body.files)
      : [];
    console.log('Plan created');
    console.log('------------');
    console.log(`Issue  : ${identifier} – ${title}`);
    if (body.branch) console.log(`Branch : ${body.branch}`);
    if (body.plan_url) console.log(`Plan   : ${body.plan_url}`);
    if (body.prerequisites_url) console.log(`Prerequisites: ${body.prerequisites_url}`);
    if (fileResults.length > 0) {
      console.log('');
      console.log('Files written:');
      for (const { name, action } of fileResults) {
        const label = action === 'backed-up'
          ? 'backed up and replaced'
          : action;
        console.log(`  ${name}: ${label}`);
      }
    }
    if (body.branch) {
      console.log('');
      console.log('Next steps');
      console.log('----------');
      console.log('git checkout main && git pull');
      console.log(`git checkout ${body.branch}`);
    }
  } else if (body.status === 'NO_PLAN') {
    console.log(`No plan was generated for ${identifier}: ${title}.`);
  } else {
    console.log(`Error: ${describeErrorStatus(body.status, body)}`);
  }

  await inquirer.prompt({ _: { type: 'input', message: 'Press Enter to continue…', default: '' } });
}

async function runDownloadTask(identifier: string, title: string, description: string): Promise<void> {
  const taskPath = resolve(REPO_ROOT, 'TASK.md');
  const content = `---\nissue_identifier: ${identifier}\n---\n# ${title}\n\n${description.trim()}\n`;

  if (existsSync(taskPath) && readFileSync(taskPath, 'utf8').trim()) {
    const { fileAction } = await inquirer.prompt({
      fileAction: {
        type: 'select',
        message: 'TASK.md already has content. Replace or create a backup?',
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
      renameSync(taskPath, resolve(REPO_ROOT, `TASK.md.${ts}.bak`));
      console.log('Backed up existing TASK.md.');
    }
  }

  writeFileSync(taskPath, content, 'utf8');
  console.log('Downloaded to TASK.md');
  await inquirer.prompt({ _: { type: 'input', message: 'Press Enter to continue…', default: '' } });
}

async function runMoveToColumn(issueId: string, teamId: string, linear: ReturnType<typeof createLinearService>): Promise<void> {
  const states = await linear.getTeamWorkflowStates(teamId);

  const columnTargets = [
    { label: 'To Do', type: 'unstarted' },
    { label: 'In Progress', type: 'started' },
    { label: 'Backlog', type: 'backlog' },
  ];

  const choices = columnTargets
    .map(({ label, type }) => {
      const state = states.find((s) => s.type === type);
      return state
        ? { name: label, value: state.id }
        : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (choices.length === 0) {
    console.log('No matching workflow states found.');
    return;
  }

  const { stateId } = await inquirer.prompt({
    stateId: {
      type: 'select',
      message: 'Move to column',
      choices: [
        ...choices,
        new inquirer.Separator(),
        { name: 'Cancel', value: BACK },
      ],
    },
  });

  if (stateId === BACK) return;

  await linear.updateIssueState(issueId, stateId as string);
  console.log('Issue moved.');
  await inquirer.prompt({ _: { type: 'input', message: 'Press Enter to continue…', default: '' } });
}

// ─── Issue detail view ────────────────────────────────────────────────────────

async function showIssueDetails(
  selectedIssue: IssueWithDependencies,
  labelsById: Map<string, string>,
  projectName: string,
  linear: ReturnType<typeof createLinearService>,
): Promise<'back' | 'exit'> {
  const { issue, blockedByIds, blockingIds, stateName } = selectedIssue;
  const [assignee, project, team] = await Promise.all([issue.assignee, issue.project, issue.team]);

  while (true) {
    console.clear();

    console.log('Project');
    console.log('-------');
    console.log(`Name  : ${project?.name ?? projectName}`);
    console.log(`State : ${project?.state ?? 'n/a'}`);
    console.log('');

    console.log(`${issue.identifier}  ${issue.title}`);
    console.log('─'.repeat(issue.identifier.length + 2 + issue.title.length));
    console.log(`Priority : ${issue.priorityLabel}`);
    console.log(`Column   : ${stateName}`);
    console.log(`Assignee : ${assignee?.name ?? 'Unassigned'}`);
    console.log(`Team     : ${team?.name ?? 'n/a'}`);
    console.log(`Created  : ${formatDate(issue.createdAt)}`);
    console.log(`Updated  : ${formatDate(issue.updatedAt)}`);
    console.log(`Due      : ${formatDate(issue.dueDate)}`);
    console.log(`URL      : ${issue.url}`);
    console.log('');

    if (blockedByIds.length > 0) {
      console.log('Blocked by:');
      for (const id of blockedByIds) console.log(`  - ${labelsById.get(id) ?? id}`);
      console.log('');
    }

    if (blockingIds.length > 0) {
      console.log('Blocking:');
      for (const id of blockingIds) console.log(`  - ${labelsById.get(id) ?? id}`);
      console.log('');
    }

    const { action } = await inquirer.prompt({
      action: {
        type: 'select',
        message: 'Choose an action',
        choices: [
          { name: 'Create plan', value: 'plan' },
          { name: 'Download task', value: 'download' },
          { name: 'Move to column', value: 'move' },
          new inquirer.Separator(),
          { name: 'Back to list', value: BACK },
          { name: 'Exit', value: EXIT },
        ],
      },
    });

    if (action === EXIT) return 'exit';
    if (action === BACK) return 'back';

    if (action === 'plan') {
      await runCreatePlan(issue.id, issue.identifier, issue.title ?? '');
    }

    if (action === 'download') {
      await runDownloadTask(issue.identifier, issue.title ?? '', issue.description ?? '');
    }

    if (action === 'move') {
      if (!team) {
        console.log('Cannot determine team for this issue.');
        continue;
      }
      await runMoveToColumn(issue.id, team.id, linear);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default async (): Promise<void> => {
  const token = await loadAccessToken();
  const linear = createLinearService(token);

  while (true) {
    const teams = await linear.getTeams();
    const selectedTeam = await promptForTeam(teams);
    if (!selectedTeam) return;

    while (true) {
      const projects = await linear.getSortedTeamProjects(selectedTeam.id);
      const projectId = await promptForProject(selectedTeam.name, projects);

      if (projectId === EXIT) return;
      if (!projectId) break;

      if (projectId === NEXT_PRIORITY) {
        const firstProject = projects[0];
        if (!firstProject) {
          console.log('No projects available.');
          continue;
        }
        const issues = await linear.getSortedProjectIssues(firstProject.project.id);
        if (issues.length === 0) {
          console.log(`No active issues found in ${firstProject.project.name}.`);
          continue;
        }
        const firstIssue = issues[0] as IssueWithDependencies;
        const labelsById = new Map<string, string>(issues.map((item) => [item.issue.id, item.issue.identifier]));
        const action = await showIssueDetails(firstIssue, labelsById, firstProject.project.name, linear);
        if (action === 'exit') return;
        continue;
      }

      const selectedProject = projects.find(({ project }) => project.id === projectId);
      if (!selectedProject) continue;

      while (true) {
        const issues = await linear.getSortedProjectIssues(selectedProject.project.id);
        const labelsById = new Map<string, string>(issues.map((item) => [item.issue.id, item.issue.identifier]));
        const issueId = await promptForIssue(selectedProject.project.name, issues);

        if (issueId === EXIT) return;
        if (!issueId) break;

        const selectedIssue = issues.find(({ issue }) => issue.id === issueId);
        if (!selectedIssue) continue;

        const action = await showIssueDetails(selectedIssue, labelsById, selectedProject.project.name, linear);
        if (action === 'exit') return;
      }
    }
  }
};
