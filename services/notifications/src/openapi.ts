/**
 * @packageDocumentation
 * OpenAPI specification for the Notifications Hub.
 *
 * Uses `@asteasolutions/zod-to-openapi` to derive schemas from the same Zod
 * validators used at runtime, keeping the spec in sync with validation logic.
 *
 * Call {@link generateOpenApiDocument} to produce a serialisable spec object.
 * The spec is served at runtime via Swagger UI (`GET /docs`) and written to
 * `.docs/swagger/openapi.json` by the `docs:generate` script.
 */
import process from 'node:process';

import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// ── Shared scalar schemas ──────────────────────────────────────────────────

const UuidSchema = z.string().uuid()
  .openapi({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });
const EntityKindSchema = z
  .enum(['anthropic', 'executor', 'mail', 'push', 'reminder', 'prompt', 'webhook'])
  .openapi({ description: 'Entity plugin identifier' });

// ── Reusable component schemas ─────────────────────────────────────────────

const ApprovalSchema = registry.register(
  'Approval',
  z.object({
    id: UuidSchema,
    job_id: UuidSchema,
    entity_kind: EntityKindSchema,
    approval_type: z.enum(['prerequisite', 'human-loop']),
    status: z.enum(['pending', 'granted', 'denied', 'expired']),
    description: z.string(),
    options: z.array(z.string()).nullable()
      .optional(),
    decision_note: z.string().nullable()
      .optional(),
    created_at: z.string().datetime(),
    decided_at: z.string().datetime()
      .nullable()
      .optional(),
    expires_at: z.string().datetime()
      .nullable()
      .optional(),
  }).openapi({ description: 'A human-gate approval request' }),
);

const ErrorSchema = registry.register(
  'Error',
  z.object({
    error: z.string().openapi({ description: 'Error message' }),
  }).openapi({ description: 'Error response' }),
);

// ── Helper: common error responses ────────────────────────────────────────

function errorResponse(description: string) {
  return {
    description,
    content: { 'application/json': { schema: ErrorSchema } },
  };
}

// ── /events ────────────────────────────────────────────────────────────────

registry.registerPath({
  method: 'post',
  path: '/events/{kind}',
  tags: ['Events'],
  summary: 'Push an event for a job',
  description: 'Persists the event, fans it out to SSE subscribers, and triggers the entity delivery hook.',
  request: {
    params: z.object({ kind: EntityKindSchema }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            jobId: UuidSchema,
            nodeId: z.string(),
            type: z.string().openapi({ description: 'Event type string owned by the entity plugin', example: 'task.done' }),
          }).openapi({ description: 'Event envelope (plus entity-specific payload fields)' }),
        },
      },
    },
  },
  responses: {
    202: { description: 'Event accepted', content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } } },
    400: errorResponse('Unknown entity kind or invalid payload'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/events/{kind}/{jobId}',
  tags: ['Events'],
  summary: 'Subscribe to the event stream for a job (SSE)',
  description:
    'Replays stored history then streams live events. Sends a heartbeat comment every 15 s. ' +
    'Response content type is `text/event-stream`.',
  request: {
    params: z.object({ kind: EntityKindSchema, jobId: UuidSchema }),
  },
  responses: {
    200: {
      description: 'Server-Sent Events stream',
      content: { 'text/event-stream': { schema: z.string().openapi({ description: 'SSE data frames' }) } },
    },
    400: errorResponse('Unknown entity kind'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/events/{kind}/{jobId}/history',
  tags: ['Events'],
  summary: 'Fetch stored event history for a job (REST)',
  description: 'Returns a JSON array of stored events — used for initial page load without SSE.',
  request: {
    params: z.object({ kind: EntityKindSchema, jobId: UuidSchema }),
  },
  responses: {
    200: {
      description: 'Array of stored events',
      content: { 'application/json': { schema: z.array(z.object({ id: UuidSchema, job_id: UuidSchema, entity_kind: EntityKindSchema, event_type: z.string(), payload: z.record(z.unknown()), created_at: z.string().datetime() })) } },
    },
    400: errorResponse('Unknown entity kind'),
  },
});

// ── /approvals ─────────────────────────────────────────────────────────────

registry.registerPath({
  method: 'post',
  path: '/approvals',
  tags: ['Approvals'],
  summary: 'Create an approval request (human gate)',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            requestId: UuidSchema,
            jobId: UuidSchema,
            nodeId: z.string(),
            entityKind: EntityKindSchema,
            type: z.enum(['prerequisite', 'human-loop']),
            description: z.string(),
            options: z.array(z.string()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: 'Approval created', content: { 'application/json': { schema: ApprovalSchema } } },
    400: errorResponse('Validation failure'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/approvals',
  tags: ['Approvals'],
  summary: 'List pending approvals',
  description: 'Filters by `jobId` when provided. Returns all pending approvals across jobs when omitted.',
  request: {
    query: z.object({
      jobId: UuidSchema.optional(),
      pending: z.enum(['true', 'false']).optional(),
    }),
  },
  responses: {
    200: { description: 'List of approvals', content: { 'application/json': { schema: z.array(ApprovalSchema) } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/approvals/{requestId}/wait',
  tags: ['Approvals'],
  summary: 'Block until an approval is decided (SSE)',
  description:
    'If the approval is already decided, returns immediately with a single SSE event. ' +
    'Otherwise streams until a decision is published. Response content type is `text/event-stream`.',
  request: {
    params: z.object({ requestId: UuidSchema }),
  },
  responses: {
    200: {
      description: 'Server-Sent Events stream — emits `{ decision, note }` on resolution',
      content: { 'text/event-stream': { schema: z.string().openapi({ description: 'SSE data frames' }) } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/approvals/{requestId}/decide',
  tags: ['Approvals'],
  summary: 'Submit a decision for an approval',
  request: {
    params: z.object({ requestId: UuidSchema }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            decision: z.enum(['granted', 'denied']),
            note: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: 'Updated approval record', content: { 'application/json': { schema: ApprovalSchema } } },
    400: errorResponse('Validation failure'),
    404: errorResponse('Approval not found or already decided'),
  },
});

// ── /status ────────────────────────────────────────────────────────────────

registry.registerPath({
  method: 'get',
  path: '/status',
  tags: ['Health'],
  summary: 'List registered entity kinds',
  responses: {
    200: {
      description: 'Registered entity kinds',
      content: {
        'application/json': {
          schema: z.object({ entityKinds: z.array(EntityKindSchema) }),
        },
      },
    },
  },
});

// ── Document generator ─────────────────────────────────────────────────────

/**
 * Generates the OpenAPI 3.0 document for the Notifications Hub.
 *
 * The returned object is JSON-serialisable and can be passed directly to
 * `swagger-ui-express` or written to disk via the `docs:generate` script.
 *
 * @returns A fully formed OpenAPI 3.0 document object.
 */
export function generateOpenApiDocument(): Record<string, unknown> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Notifications Hub',
      version: '0.0.1',
      description:
        'Event hub — pure event fan-out (SSE) and human-gate approval workflows. Job/task/worker state is owned by the executor service.',
    },
    servers: [{ url: `http://localhost:${process.env['PORT'] ?? 4400}` }],
  }) as unknown as Record<string, unknown>;
}
