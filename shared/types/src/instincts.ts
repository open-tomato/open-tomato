/**
 * Shared types for the hive learning instinct system.
 *
 * These types define the contract between containers and the orchestrator
 * aggregator. They are used by `apps/orchestrator` (HTTP endpoints, merge
 * logic) and by `scripts/sync-agent.ts` / `scripts/bootstrap-instincts.ts`.
 */

/** Shape of an instinct record exchanged between containers and the aggregator. */
export interface InstinctRecord {
  readonly id: string;
  readonly trigger: string;
  readonly action: string;
  readonly action_hash: string;
  readonly confidence: number;
  readonly usage_count: number;
  readonly created_at: string;
  readonly updated_at: string;
}

/** The blessed bundle returned by `GET /api/instincts/blessed`. */
export interface BlessedBundle {
  /** ISO 8601 timestamp of the bundle generation. */
  readonly version: string;
  /** Active (non-flagged) blessed instincts. */
  readonly instincts: ReadonlyArray<InstinctRecord>;
}

/** Payload sent by a container to `POST /api/instincts/sync`. */
export interface SyncPayload {
  /** UUID identifying the sending container. */
  readonly container_id: string;
  /** Instincts to sync from this container. */
  readonly instincts: ReadonlyArray<InstinctRecord>;
}
