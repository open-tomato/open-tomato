import type { IssueWithDependencies, ProjectWithDependencies, WorkflowState } from './types.js';

import {
  LinearClient,
  type Issue,
  type IssueRelation,
  type Project,
  type ProjectRelation,
  type Team,
} from '@linear/sdk';

import {
  collectAllNodes,
  normalizePriority,
  relationTypeToEdge,
  summarizeDependencies,
  topologicalSort,
} from './utils.js';

const DEFAULT_PAGE_SIZE = 100;

function compareProjects(a: Project, b: Project): number {
  const priorityDelta = normalizePriority(a.priority) - normalizePriority(b.priority);
  if (priorityDelta !== 0) return priorityDelta;
  const createdAtDelta = a.createdAt.getTime() - b.createdAt.getTime();
  if (createdAtDelta !== 0) return createdAtDelta;
  return a.id.localeCompare(b.id);
}

async function getProjectRelations(project: Project): Promise<ProjectRelation[]> {
  const [relations, inverseRelations] = await Promise.all([
    collectAllNodes(project.relations({ first: DEFAULT_PAGE_SIZE })),
    collectAllNodes(project.inverseRelations({ first: DEFAULT_PAGE_SIZE })),
  ]);

  const deduped = new Map<string, ProjectRelation>();
  for (const relation of [...relations, ...inverseRelations]) {
    deduped.set(relation.id, relation);
  }

  return [...deduped.values()];
}

async function getIssueRelations(issue: Issue): Promise<IssueRelation[]> {
  const [relations, inverseRelations] = await Promise.all([
    collectAllNodes(issue.relations({ first: DEFAULT_PAGE_SIZE })),
    collectAllNodes(issue.inverseRelations({ first: DEFAULT_PAGE_SIZE })),
  ]);

  const deduped = new Map<string, IssueRelation>();
  for (const relation of [...relations, ...inverseRelations]) {
    deduped.set(relation.id, relation);
  }

  return [...deduped.values()];
}

const VISIBLE_STATE_TYPES = new Set(['started', 'unstarted', 'backlog']);

type IssueWithState = { issue: Issue; stateName: string; stateType: string };

async function filterVisibleIssues(issues: Issue[]): Promise<IssueWithState[]> {
  const results = await Promise.all(
    issues.map(async (issue) => {
      const state = await issue.state;
      if (!state || !VISIBLE_STATE_TYPES.has(state.type)) return null;
      return { issue, stateName: state.name, stateType: state.type };
    }),
  );

  return results.filter((r): r is IssueWithState => r !== null);
}

export async function getTeams(client: LinearClient): Promise<Team[]> {
  const teams = await collectAllNodes(client.teams({ first: DEFAULT_PAGE_SIZE }));
  return teams.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSortedTeamProjects(
  client: LinearClient,
  teamId: string,
): Promise<ProjectWithDependencies[]> {
  const team = await client.team(teamId);
  const projects = await collectAllNodes(team.projects({ first: DEFAULT_PAGE_SIZE }));
  const activeProjects = projects.filter((project) => !project.archivedAt && !project.trashed);

  const relationGroups = await Promise.all(
    activeProjects.map(async (project) => ({
      projectId: project.id,
      relations: await getProjectRelations(project),
    })),
  );

  const edges = relationGroups.flatMap(({ relations }) => relations
    .map((relation) => relationTypeToEdge(relation.type, relation.projectId, relation.relatedProjectId))
    .filter((edge): edge is [string, string] => edge !== null));

  const summaries = summarizeDependencies(activeProjects, edges);
  const orderedProjects = topologicalSort(
    activeProjects,
    (project) => project.id,
    edges,
    compareProjects,
  );

  return orderedProjects.map((project) => {
    const dependencySummary = summaries.get(project.id) ?? { blockedByIds: [], blockingIds: [] };
    return {
      project,
      blockedByIds: dependencySummary.blockedByIds,
      blockingIds: dependencySummary.blockingIds,
    };
  });
}

export async function getSortedProjectIssues(
  client: LinearClient,
  projectId: string,
): Promise<IssueWithDependencies[]> {
  const project = await client.project(projectId);
  const issues = await collectAllNodes(project.issues({ first: DEFAULT_PAGE_SIZE }));
  const activeIssues = issues.filter((issue) => !issue.archivedAt && !issue.trashed);
  const issuesWithState = await filterVisibleIssues(activeIssues);
  const visibleIssues = issuesWithState.map(({ issue }) => issue);
  const stateById = new Map(
    issuesWithState.map(({ issue, stateName, stateType }) => [issue.id, { stateName, stateType }]),
  );

  const relationGroups = await Promise.all(
    visibleIssues.map(async (issue) => ({
      issueId: issue.id,
      relations: await getIssueRelations(issue),
    })),
  );

  const edges = relationGroups.flatMap(({ relations }) => relations
    .map((relation) => relationTypeToEdge(relation.type, relation.issueId, relation.relatedIssueId))
    .filter((edge): edge is [string, string] => edge !== null));

  const summaries = summarizeDependencies(visibleIssues, edges);

  const blockingCountById = new Map(
    visibleIssues.map((issue) => [issue.id, summaries.get(issue.id)?.blockingIds.length ?? 0]),
  );

  function compareWithBlocking(a: Issue, b: Issue): number {
    const priorityDelta = normalizePriority(a.priority) - normalizePriority(b.priority);
    if (priorityDelta !== 0) return priorityDelta;
    const blockingDelta = (blockingCountById.get(b.id) ?? 0) - (blockingCountById.get(a.id) ?? 0);
    if (blockingDelta !== 0) return blockingDelta;
    const numberDelta = a.number - b.number;
    if (numberDelta !== 0) return numberDelta;
    return a.createdAt.getTime() - b.createdAt.getTime();
  }

  const orderedIssues = topologicalSort(visibleIssues, (issue) => issue.id, edges, compareWithBlocking);

  return orderedIssues.map((issue) => {
    const dependencySummary = summaries.get(issue.id) ?? { blockedByIds: [], blockingIds: [] };
    const stateInfo = stateById.get(issue.id) ?? { stateName: '', stateType: '' };
    return {
      issue,
      blockedByIds: dependencySummary.blockedByIds,
      blockingIds: dependencySummary.blockingIds,
      stateName: stateInfo.stateName,
      stateType: stateInfo.stateType,
    };
  });
}

export async function getTeamWorkflowStates(
  client: LinearClient,
  teamId: string,
): Promise<WorkflowState[]> {
  const team = await client.team(teamId);
  const states = await collectAllNodes(team.states({ first: DEFAULT_PAGE_SIZE }));
  return states.map((s) => ({ id: s.id, name: s.name, type: s.type }));
}

export async function updateIssueState(
  client: LinearClient,
  issueId: string,
  stateId: string,
): Promise<void> {
  await client.updateIssue(issueId, { stateId });
}

export function createLinearService(accessToken: string) {
  const client = new LinearClient({ accessToken });
  return {
    getTeams: () => getTeams(client),
    getSortedTeamProjects: (teamId: string) => getSortedTeamProjects(client, teamId),
    getSortedProjectIssues: (projectId: string) => getSortedProjectIssues(client, projectId),
    getTeamWorkflowStates: (teamId: string) => getTeamWorkflowStates(client, teamId),
    updateIssueState: (issueId: string, stateId: string) => updateIssueState(client, issueId, stateId),
  };
}
