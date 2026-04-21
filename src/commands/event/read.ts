#!/usr/bin/env bun
/**
 * tomato event read
 *
 * Fetches recent events from the notification service and pretty-prints them.
 * After listing, marks the fetched events as read.
 *
 * Usage:
 *   tomato event read [-k <kind>] [--limit <n>] [-p <port>] [-h]
 *
 * Flags:
 *   -k, --kind <string>    Filter by entity kind (executor|mail|push|...).
 *   --limit <number>       Max events to fetch (default: 5).
 *   -p, --port <number>    Notification service port (default: 4400).
 *   -h, --help             Show this help message.
 *
 * NOTE (CLI): This command calls stub endpoints that do not yet exist on the
 * notification service. Once the service adds the following routes, update
 * this file and remove the stub implementations:
 *
 *   GET  /events?kind=<kind>&limit=<n>   → returns EventRow[]
 *   POST /events/mark-read               → body: { ids: string[] }
 *
 * Track changes to the service contract in:
 *   services/notifications/src/routes/events.ts
 */

import type { EventRow } from './utils/format.js';

import process from 'node:process';

import { getBoolFlag, getNumberFlag, getStringFlag, parseArgs, usageError } from './utils/args.js';
import { createClient } from './utils/client.js';
import { ENTITY_KINDS, isEntityKind } from './utils/config.js';
import { formatAxiosError, formatEventList } from './utils/format.js';

const HELP = `
Usage: tomato event read [options]

Fetches recent events from the notification service and marks them as read.

Options:
  -k, --kind <string>    Filter by entity kind: ${ENTITY_KINDS.join(' | ')}
  --limit <number>       Max events to fetch (default: 5)
  -p, --port <number>    Notification service port (default: 4400)
  -h, --help             Show this help message

Examples:
  tomato event read
  tomato event read --kind executor --limit 10
`;

// ── Stub: fetch recent events ────────────────────────────────────────────────
//
// Calls GET /events on the notification service.
// This endpoint does not exist yet. Once added it should return an array of
// event rows filtered by kind and limited to `limit` entries (newest first).
//
// Expected response shape: EventRow[]
//
// NOTE (CLI): Update this function when the service adds GET /events.
// See services/notifications/src/routes/events.ts for the existing routes.

async function fetchRecentEvents(
  client: ReturnType<typeof createClient>,
  kind: string | undefined,
  limit: number,
): Promise<EventRow[]> {
  const params: Record<string, string | number> = { limit };
  if (kind) params['kind'] = kind;

  const response = await client.get<EventRow[]>('/events', { params });
  return response.data;
}

// ── Stub: mark events as read ────────────────────────────────────────────────
//
// Calls POST /events/mark-read on the notification service.
// This endpoint does not exist yet. Once added it should accept a list of
// event IDs and mark them as read in the database.
//
// Expected request body: { ids: string[] }
// Expected response: { ok: true, marked: number }
//
// NOTE (CLI): Update this function when the service adds POST /events/mark-read.
// See services/notifications/src/routes/events.ts for the existing routes.

async function markEventsAsRead(
  client: ReturnType<typeof createClient>,
  ids: string[],
): Promise<void> {
  await client.post('/events/mark-read', { ids });
}

export default async function read(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);

  if (getBoolFlag(flags, 'h', 'help')) {
    console.log(HELP);
    return;
  }

  const kind = getStringFlag(flags, 'kind', 'k');
  const limit = getNumberFlag(flags, 'limit') ?? 5;
  const port = getNumberFlag(flags, 'p', 'port');

  if (kind && !isEntityKind(kind)) {
    usageError(`Unknown entity kind "${kind}". Valid kinds: ${ENTITY_KINDS.join(', ')}`, HELP);
  }

  const client = createClient(port);

  let events: EventRow[];
  try {
    events = await fetchRecentEvents(client, kind, limit);
  } catch (err) {
    console.error('Failed to fetch events:');
    console.error(formatAxiosError(err));
    process.exit(1);
  }

  console.log(formatEventList(events));

  if (events.length === 0) return;

  const ids = events.map((e) => e.id);
  try {
    await markEventsAsRead(client, ids);
    console.log(`\nMarked ${ids.length} event(s) as read.`);
  } catch (err) {
    console.error('Failed to mark events as read:');
    console.error(formatAxiosError(err));
    // Non-fatal: events were already displayed; exit 0 so the caller can still use the output.
  }
}
