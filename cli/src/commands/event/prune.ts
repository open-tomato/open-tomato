#!/usr/bin/env bun
/**
 * tomato event prune
 *
 * Prunes events from the notification service that match the given criteria.
 *
 * Usage:
 *   tomato event prune [-k <kind>] [--older-than <duration>] [-p <port>] [-h]
 *
 * Flags:
 *   -k, --kind <string>         Filter by entity kind (executor|mail|push|...).
 *   --older-than <duration>     Prune events older than this duration (e.g. 30d, 2h, 1w).
 *                               Use "any" to prune all events of the specified kind.
 *   -p, --port <number>         Notification service port (default: 4400).
 *   -h, --help                  Show this help message.
 *
 * NOTE (CLI): This command calls a stub endpoint that does not yet exist on the
 * notification service. Once the service adds the following route, update this
 * file and remove the stub implementation:
 *
 *   DELETE /events?kind=<kind>&olderThan=<duration>
 *     → Soft-deletes events matching the criteria (sets a deleted_at timestamp).
 *     → Returns { ok: true, pruned: number }
 *
 * Track changes to the service contract in:
 *   services/notifications/src/routes/events.ts
 */

import process from 'node:process';

import { getBoolFlag, getNumberFlag, getStringFlag, parseArgs, usageError } from './utils/args.js';
import { createClient } from './utils/client.js';
import { ENTITY_KINDS, isEntityKind } from './utils/config.js';
import { formatAxiosError } from './utils/format.js';

const HELP = `
Usage: tomato event prune [options]

Prunes events from the notification service that match the given criteria.
Events are soft-deleted (flagged) not permanently removed.

Options:
  -k, --kind <string>       Filter by entity kind: ${ENTITY_KINDS.join(' | ')}
  --older-than <duration>   Duration string: 30d, 2h, 1w, or "any" to prune all
  -p, --port <number>       Notification service port (default: 4400)
  -h, --help                Show this help message

Examples:
  tomato event prune --kind executor --older-than 30d
  tomato event prune --kind mail --older-than any
  tomato event prune --older-than 7d
`;

// ── Stub: prune events ────────────────────────────────────────────────────────
//
// Calls DELETE /events on the notification service.
// This endpoint does not exist yet. Once added it should soft-delete events
// matching the given kind and/or age criteria.
//
// Expected query params:
//   kind      - (optional) entity kind to filter by
//   olderThan - (optional) duration string: "30d", "2h", "1w", or "any"
//
// Expected response: { ok: true, pruned: number }
//
// NOTE (CLI): Update this function when the service adds DELETE /events.
// See services/notifications/src/routes/events.ts for the existing routes.

async function pruneEvents(
  client: ReturnType<typeof createClient>,
  kind: string | undefined,
  olderThan: string | undefined,
): Promise<{ pruned: number }> {
  const params: Record<string, string> = {};
  if (kind) params['kind'] = kind;
  if (olderThan) params['olderThan'] = olderThan;

  const response = await client.delete<{ ok: boolean; pruned: number }>('/events', { params });
  return { pruned: response.data.pruned };
}

export default async function prune(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);

  if (getBoolFlag(flags, 'h', 'help')) {
    console.log(HELP);
    return;
  }

  const kind = getStringFlag(flags, 'kind', 'k');
  const olderThan = getStringFlag(flags, 'older-than');
  const port = getNumberFlag(flags, 'p', 'port');

  if (kind && !isEntityKind(kind)) {
    usageError(`Unknown entity kind "${kind}". Valid kinds: ${ENTITY_KINDS.join(', ')}`, HELP);
  }

  if (!kind && !olderThan) {
    usageError('At least one of --kind or --older-than is required to avoid accidental mass pruning', HELP);
  }

  const client = createClient(port);

  const description = [
    kind
      ? `kind "${kind}"`
      : 'all kinds',
    olderThan
      ? `older than ${olderThan}`
      : '(no age filter)',
  ].join(', ');

  console.log(`Pruning events: ${description}…`);

  try {
    const { pruned } = await pruneEvents(client, kind, olderThan);
    console.log(`Pruned ${pruned} event(s).`);
  } catch (err) {
    console.error('Failed to prune events:');
    console.error(formatAxiosError(err));
    process.exit(1);
  }
}
