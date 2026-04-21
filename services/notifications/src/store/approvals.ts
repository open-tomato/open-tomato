/**
 * @packageDocumentation
 * Data-access helpers for the approvals table (human-gate workflow).
 */
import type { Db } from '../db/index.js';
import type { EntityKind } from '../entity/types.js';

import { and, eq } from 'drizzle-orm';

import { approvalsTable } from '../db/schema.js';

export interface CreateApprovalParams {
  requestId: string;
  jobId: string;
  entityKind: EntityKind;
  approvalType: 'prerequisite' | 'human-loop';
  description: string;
  options?: string[];
  expiresAt?: Date;
}

export interface DecideApprovalParams {
  requestId: string;
  decision: 'granted' | 'denied';
  note?: string;
}

/**
 * Creates a new pending approval request and persists it.
 *
 * @param db - Drizzle database instance.
 * @param params - Fields for the new approval request.
 * @returns The inserted approval row.
 */
export async function createApproval(db: Db, params: CreateApprovalParams) {
  const [row] = await db
    .insert(approvalsTable)
    .values({
      id: params.requestId,
      job_id: params.jobId,
      entity_kind: params.entityKind,
      approval_type: params.approvalType,
      status: 'pending',
      description: params.description,
      options: params.options ?? null,
      expires_at: params.expiresAt ?? null,
    })
    .returning();

  return row;
}

/**
 * Records a human decision (grant or deny) and returns the updated row.
 *
 * @param db - Drizzle database instance.
 * @param params - Decision details including the outcome and optional note.
 * @returns The updated approval row, or `null` if not found or already decided.
 */
export async function decideApproval(db: Db, params: DecideApprovalParams) {
  const [row] = await db
    .update(approvalsTable)
    .set({
      status: params.decision === 'granted'
        ? 'granted'
        : 'denied',
      decision_note: params.note ?? null,
      decided_at: new Date(),
    })
    .where(
      and(
        eq(approvalsTable.id, params.requestId),
        eq(approvalsTable.status, 'pending'),
      ),
    )
    .returning();

  return row ?? null;
}

/**
 * Returns all pending approvals for a job, ordered by creation time.
 *
 * @param db - Drizzle database instance.
 * @param jobId - UUID of the job to filter by.
 * @returns Array of pending approval rows.
 */
export async function getPendingApprovals(db: Db, jobId: string) {
  return db
    .select()
    .from(approvalsTable)
    .where(
      and(eq(approvalsTable.job_id, jobId), eq(approvalsTable.status, 'pending')),
    )
    .orderBy(approvalsTable.created_at);
}

/**
 * Returns all pending approvals across all jobs (approval inbox view).
 *
 * @param db - Drizzle database instance.
 * @returns Array of pending approval rows ordered by creation time.
 */
export async function getAllPendingApprovals(db: Db) {
  return db
    .select()
    .from(approvalsTable)
    .where(eq(approvalsTable.status, 'pending'))
    .orderBy(approvalsTable.created_at);
}

/**
 * Looks up a single approval by its request ID.
 *
 * @param db - Drizzle database instance.
 * @param requestId - UUID of the approval request.
 * @returns The approval row, or `null` if not found.
 */
export async function getApproval(db: Db, requestId: string) {
  const [row] = await db
    .select()
    .from(approvalsTable)
    .where(eq(approvalsTable.id, requestId));

  return row ?? null;
}
