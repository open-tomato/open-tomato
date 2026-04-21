import type { Team } from '@linear/sdk';
import type { IssueWithDependencies, ProjectWithDependencies } from '@open-tomato/linear';

import { createLinearService } from '@open-tomato/linear';

export async function getLinearTeams(token: string): Promise<Team[]> {
  const service = createLinearService(token);
  return service.getTeams();
}

export async function getLinearProjects(
  token: string,
  teamId: string,
): Promise<ProjectWithDependencies[]> {
  const service = createLinearService(token);
  return service.getSortedTeamProjects(teamId);
}

export async function getLinearIssues(
  token: string,
  projectId: string,
): Promise<IssueWithDependencies[]> {
  const service = createLinearService(token);
  return service.getSortedProjectIssues(projectId);
}
