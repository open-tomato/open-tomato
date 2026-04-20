import type { Issue, Project } from '@linear/sdk';

export type ProjectWithDependencies = {
  project: Project;
  blockedByIds: string[];
  blockingIds: string[];
};

export type IssueWithDependencies = {
  issue: Issue;
  blockedByIds: string[];
  blockingIds: string[];
  stateName: string;
  stateType: string;
};

export type WorkflowState = {
  id: string;
  name: string;
  type: string;
};
