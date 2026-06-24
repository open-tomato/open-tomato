// 200 responses
export const noPlanResponse = [{
  'success': true,
  'status': 'NO_PLAN',
  'issue_id': 'OPT-172',
  'uuid': '0b63e47e-4bf8-4e70-88e2-5b16cb33b339',
  'issue_title': 'Create packages/service-core - shared runtime contract for services and MCPs',
}];

export const planCreatedResponse = [{
  'success': true,
  'status': 'PLAN_CREATED',
  'issue_id': 'OPT-172',
  'uuid': '0b63e47e-4bf8-4e70-88e2-5b16cb33b339',
  'issue_title': 'Create packages/service-core - shared runtime contract for services and MCPs',
  'files': {
    'PLAN.md': '# Plan:\n\n- [ ] Task 1\n- [ ] Task 2\n',
    'PREREQUISITES.md': '# Prerequisites:\n\n- [ ] Prerequisite 1\n- [ ] Prerequisite 2\n',
  },
}];

// 404 responses
export const noIssueFoundResponse = [{
  'success': false,
  'status': 'NO_ISSUES_FOUND',
  'issue_id': '0b63e47e-4bf8-4e70-88e2-5b16cb33b339',
}];

export const noLinkToRepoResponse = [{
  'success': false,
  'status': 'NO_LINK_RESOURCE',
  'issue_id': 'OPT-172',
  'uuid': '0b63e47e-4bf8-4e70-88e2-5b16cb33b339',
  'repository': 'bifemecanico/open-tomato',
}];

export const noAgentsContextResponse = [{
  'success': false,
  'status': 'NO_AGENTS_CONTEXT',
  'issue_id': 'OPT-172',
  'uuid': '0b63e47e-4bf8-4e70-88e2-5b16cb33b339',
  'repository': 'bifemecanico/open-tomato',
}];

// 500 responses
export const errorResponse = [{
  'success': false,
  'status': 'ERROR',
  'issue_id': 'OPT-172',
  'uuid': '0b63e47e-4bf8-4e70-88e2-5b16cb33b339',
  'issue_title': 'Create packages/service-core - shared runtime contract for services and MCPs',
  'message': 'Something went wrong',
}];
