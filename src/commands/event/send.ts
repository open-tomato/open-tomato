#!/usr/bin/env bun
/**
 * tomato event send
 *
 * Sends an event to the notification service.
 *
 * Usage:
 *   tomato event send --kind <kind> --type <eventType> --payload <json>
 *                     [--job-id <uuid>] [--node-id <string>]
 *                     [--no-validation] [-p <port>] [-h]
 *
 * Flags:
 *   --kind, -k       Entity kind (executor|mail|push|reminder|prompt|webhook). Required.
 *   --type, -t       Event type within the kind (e.g. loop.started). Required.
 *   --payload        JSON string of the event payload fields. Required.
 *   --job-id         UUID of the job. Auto-generated if omitted.
 *   --node-id        Node identifier. Defaults to "events-cli-<whoami>".
 *   --no-validation  Skip local schema validation before sending.
 *   -p, --port       Notification service port (default: 4400).
 *   -h, --help       Show this help message.
 */

import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import process from 'node:process';

import { getBoolFlag, getNumberFlag, getStringFlag, parseArgs, usageError } from './utils/args.js';
import { createClient } from './utils/client.js';
import { ENTITY_KINDS, isEntityKind } from './utils/config.js';
import { formatAxiosError, printValidationError } from './utils/format.js';
import { entitySchemas, EventEnvelopeSchema } from './utils/schemas.js';

const HELP = `
Usage: tomato event send --kind <kind> --type <eventType> --payload <json> [options]

Sends an event to the notification service.

Required:
  --kind, -k <string>    Entity kind: ${ENTITY_KINDS.join(' | ')}
  --type, -t <string>    Event type (e.g. loop.started, task.done)
  --payload <json>       JSON string of the event-specific payload fields

Options:
  --job-id <uuid>        Job UUID (auto-generated if omitted)
  --node-id <string>     Node identifier (default: events-cli-<whoami>)
  --no-validation        Skip local schema validation before sending
  -p, --port <number>    Notification service port (default: 4400)
  -h, --help             Show this help message

Examples:
  tomato event send --kind executor --type loop.started \\
    --payload '{"branch":"main","planTasksCount":3,"prereqTasksCount":1}'

  tomato event send --kind executor --type log \\
    --payload '{"stream":"stdout","line":"hello"}' --no-validation
`;

function getDefaultNodeId(): string {
  const result = spawnSync('whoami', [], { encoding: 'utf8' });
  const user = result.stdout?.trim();
  return user
    ? `events-cli-${user}`
    : 'events-cli-unknown';
}

export default async function send(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);

  if (getBoolFlag(flags, 'h', 'help')) {
    console.log(HELP);
    return;
  }

  const kind = getStringFlag(flags, 'kind', 'k');
  const eventType = getStringFlag(flags, 'type', 't');
  const payloadRaw = getStringFlag(flags, 'payload');
  const port = getNumberFlag(flags, 'p', 'port');
  const noValidation = getBoolFlag(flags, 'no-validation');
  const jobId = getStringFlag(flags, 'job-id') ?? randomUUID();
  const nodeId = getStringFlag(flags, 'node-id') ?? getDefaultNodeId();

  if (!kind) usageError('--kind is required', HELP);
  if (!eventType) usageError('--type is required', HELP);
  if (!payloadRaw) usageError('--payload is required', HELP);
  if (!isEntityKind(kind)) {
    usageError(`Unknown entity kind "${kind}". Valid kinds: ${ENTITY_KINDS.join(', ')}`, HELP);
  }

  let payloadFields: Record<string, unknown>;
  try {
    payloadFields = JSON.parse(payloadRaw) as Record<string, unknown>;
  } catch {
    usageError('--payload must be a valid JSON string', HELP);
  }

  const body = { jobId, nodeId, type: eventType, ...payloadFields };

  if (!noValidation) {
    const envelopeResult = EventEnvelopeSchema.safeParse(body);
    if (!envelopeResult.success) {
      printValidationError('Invalid envelope', envelopeResult.error.issues);
      process.exit(1);
    }

    const schema = entitySchemas[kind];
    const payloadResult = schema.safeParse(body);
    if (!payloadResult.success) {
      printValidationError(`Invalid payload for kind "${kind}"`, payloadResult.error.issues);
      process.exit(1);
    }
  }

  const client = createClient(port);

  try {
    const response = await client.post(`/events/${kind}`, body);
    console.log('Event sent successfully.');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Failed to send event:');
    console.error(formatAxiosError(err));
    process.exit(1);
  }
}
