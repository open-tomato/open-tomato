/**
 * @packageDocumentation
 * Generates plans from requirements by calling the workflow API (for Linear
 * requirements) or parsing tasks directly from the stored description
 * (for MD files that already contain task checklists).
 */

import type { Db } from '../db/index.js';
import type { Plan, Requirement } from '../db/schema.js';

import { callWorkflowApi } from '@open-tomato/linear';

import { createPlan } from '../store/plans.js';
import { bulkCreateTasks } from '../store/tasks.js';
import { createLog } from '../store/logs.js';
import { hasTasks, parseMdPlan, extractPlanName } from '../parser/md-parser.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerationResult {
  plan: Plan;
  taskCount: number;
  method: 'workflow_api' | 'direct_parse';
}

// ---------------------------------------------------------------------------
// Plan generation
// ---------------------------------------------------------------------------

/**
 * Creates a plan from a validated requirement.
 *
 * **Linear requirements**: Calls the workflow API (`callWorkflowApi`) which
 * returns `PLAN.md` content with tasks. Parses tasks from the response.
 *
 * **MD file requirements with tasks**: Parses tasks directly from the stored
 * `description` field (smart detection via `hasTasks`).
 *
 * **MD file requirements without tasks**: Creates a plan with no tasks
 * (status: 'backlog'). Tasks will need to be added manually or via
 * a future workflow integration.
 */
export async function generatePlanFromRequirement(
  db: Db,
  requirement: Requirement,
): Promise<GenerationResult> {
  const isLinear = requirement.entity_type === 'linear';
  const mdWithTasks = requirement.entity_type === 'md'
    && requirement.description
    && hasTasks(requirement.description);

  if (isLinear) {
    return generateViaWorkflowApi(db, requirement);
  }

  if (mdWithTasks) {
    return generateFromMdContent(db, requirement);
  }

  // No tasks available — create an empty plan in backlog
  return createEmptyPlan(db, requirement);
}

// ---------------------------------------------------------------------------
// Linear: workflow API
// ---------------------------------------------------------------------------

async function generateViaWorkflowApi(
  db: Db,
  requirement: Requirement,
): Promise<GenerationResult> {
  const metadata = requirement.entity_metadata as Record<string, unknown> | null;
  const issueId = (metadata?.['issueId'] as string) ?? requirement.entity_id;
  const repository = requirement.repository ?? '';

  const { statusCode, body } = await callWorkflowApi(issueId, repository);

  if (statusCode < 200 || statusCode >= 300 || body.status !== 'PLAN_CREATED') {
    throw new Error(
      `Workflow API failed for ${requirement.identifier}: status=${body.status}, message=${body.message ?? 'none'}`,
    );
  }

  // Parse tasks from the returned PLAN.md content
  const planContent = body.files?.['PLAN.md'] ?? '';
  const tasks = parseMdPlan(planContent);
  const branch = body.branch ?? (requirement.identifier
    ? `feature/${requirement.identifier}`
    : null);

  const plan = await createPlan(db, {
    requirement_id: requirement.id,
    name: requirement.name,
    description: planContent || requirement.description,
    repository,
    branch,
    status: tasks.length > 0 ? 'ready' : 'backlog',
  });

  if (tasks.length > 0) {
    await bulkCreateTasks(db, plan.id, tasks);
  }

  await createLog(db, {
    plan_id: plan.id,
    event_type: 'plan.generated',
    status_message: `Generated via workflow API with ${tasks.length} task(s)`,
    metadata: {
      method: 'workflow_api',
      branch: body.branch,
      plan_url: body.plan_url,
    },
  });

  return { plan, taskCount: tasks.length, method: 'workflow_api' };
}

// ---------------------------------------------------------------------------
// MD file: direct parse
// ---------------------------------------------------------------------------

async function generateFromMdContent(
  db: Db,
  requirement: Requirement,
): Promise<GenerationResult> {
  const content = requirement.description ?? '';
  const tasks = parseMdPlan(content);
  const name = extractPlanName(content, requirement.name);
  const repository = requirement.repository ?? '';
  const branch = requirement.identifier
    ? `feature/${requirement.identifier}`
    : null;

  const plan = await createPlan(db, {
    requirement_id: requirement.id,
    name,
    description: content,
    repository,
    branch,
    status: tasks.length > 0 ? 'ready' : 'backlog',
  });

  if (tasks.length > 0) {
    await bulkCreateTasks(db, plan.id, tasks);
  }

  await createLog(db, {
    plan_id: plan.id,
    event_type: 'plan.generated',
    status_message: `Parsed ${tasks.length} task(s) directly from MD content`,
    metadata: { method: 'direct_parse' },
  });

  return { plan, taskCount: tasks.length, method: 'direct_parse' };
}

// ---------------------------------------------------------------------------
// Empty plan (no tasks available yet)
// ---------------------------------------------------------------------------

async function createEmptyPlan(
  db: Db,
  requirement: Requirement,
): Promise<GenerationResult> {
  const repository = requirement.repository ?? '';

  const plan = await createPlan(db, {
    requirement_id: requirement.id,
    name: requirement.name,
    description: requirement.description,
    repository,
    branch: requirement.identifier
      ? `feature/${requirement.identifier}`
      : null,
    status: 'backlog',
  });

  await createLog(db, {
    plan_id: plan.id,
    event_type: 'plan.generated',
    status_message: 'Created empty plan — no tasks available from source',
    metadata: { method: 'empty' },
  });

  return { plan, taskCount: 0, method: 'direct_parse' };
}
