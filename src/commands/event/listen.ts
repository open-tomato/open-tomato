#!/usr/bin/env bun
/**
 * tomato event listen
 *
 * Starts a local HTTP server that receives events and prints them to the terminal.
 * Mimics a service that awaits incoming notifications from the notification service.
 *
 * Without --callback: accepts POST to any path and prints the event.
 * With --callback <path>: responds 200 only to that path; 404 for all others.
 *   - 400 if the request body fails schema validation.
 *   - Warning printed to terminal on 404 path hits.
 *   - Error printed to terminal on 400 validation failures.
 *
 * Usage:
 *   tomato event listen [-p <port>] [--callback <path>] [-k <kind>] [-h]
 *
 * Flags:
 *   -p, --port <number>      Local server port (default: 4000).
 *   --callback <path>        Path to listen on exclusively (e.g. /approvals/wait).
 *   -k, --kind <string>      Entity kind to validate against when --callback is set.
 *   -h, --help               Show this help message.
 */

import type { Request, Response } from 'express';

import process from 'node:process';

import express from 'express';

import { getBoolFlag, getNumberFlag, getStringFlag, parseArgs } from './utils/args.js';
import { DEFAULT_LISTEN_PORT, isEntityKind } from './utils/config.js';
import { formatEvent, printValidationError } from './utils/format.js';
import { entitySchemas, EventEnvelopeSchema } from './utils/schemas.js';

const HELP = `
Usage: tomato event listen [options]

Starts a local HTTP server that receives events and prints them to the terminal.
Simulates a service awaiting callback notifications from the notification service.

Options:
  -p, --port <number>      Local server port (default: 4000)
  --callback <path>        Accept events only at this path (e.g. /approvals/wait)
  -k, --kind <string>      Entity kind to validate against (used with --callback)
  -h, --help               Show this help message

Examples:
  tomato event listen
  tomato event listen -p 4000 --callback /approvals/wait --kind executor
`;

export default async function listen(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);

  if (getBoolFlag(flags, 'h', 'help')) {
    console.log(HELP);
    return;
  }

  const port = getNumberFlag(flags, 'p', 'port') ?? DEFAULT_LISTEN_PORT;
  const callbackPath = getStringFlag(flags, 'callback');
  const kindArg = getStringFlag(flags, 'kind', 'k');

  const app = express();
  app.use(express.json());
   
  app.post('*', (req: Request, res: Response) => {
    const reqPath = req.path;

    // In callback mode, reject requests to unexpected paths
    if (callbackPath && reqPath !== callbackPath) {
      console.warn(`[WARN] Unexpected path: POST ${reqPath} — expected ${callbackPath}`);
      res.status(404).json({ error: `Not found: ${reqPath}` });
      return;
    }

    const body = req.body as Record<string, unknown>;

    // Validate envelope
    const envelopeResult = EventEnvelopeSchema.safeParse(body);
    if (!envelopeResult.success) {
      printValidationError(`Envelope validation failed on POST ${reqPath}`, envelopeResult.error.issues);
      res.status(400).json({ error: 'Invalid envelope', issues: envelopeResult.error.issues });
      return;
    }

    // Validate against entity-specific schema if kind is known
    if (callbackPath && kindArg) {
      if (!isEntityKind(kindArg)) {
        console.warn(`[WARN] Unknown kind "${kindArg}" — skipping payload validation`);
      } else {
        const schema = entitySchemas[kindArg];
        const payloadResult = schema.safeParse(body);
        if (!payloadResult.success) {
          printValidationError(`Payload validation failed for kind "${kindArg}"`, payloadResult.error.issues);
          res.status(400).json({ error: 'Invalid payload', issues: payloadResult.error.issues });
          return;
        }
      }
    }

    // Print the received event
    const event = {
      id: (body['jobId'] as string | undefined) ?? '(no-id)',
      entity_kind: kindArg ?? 'unknown',
      event_type: (body['type'] as string | undefined) ?? '(unknown)',
      payload: body,
      created_at: new Date().toISOString(),
    };
    console.log('\nEvent received:');
    console.log(formatEvent(event));

    // Response stub: always 200 for now.
    // TODO: Add --response flag support for conditional mocked responses.
    res.status(200).json({ ok: true });
  });

  await new Promise<void>((resolve) => {
    const server = app.listen(port, () => {
      const mode = callbackPath
        ? `callback mode (listening on ${callbackPath})`
        : 'open mode (accepting all paths)';
      console.log(`Listening for events on http://localhost:${port} [${mode}]`);
      console.log('Press Ctrl+C to stop.\n');
    });

    process.on('SIGINT', () => {
      console.log('\nStopping listener…');
      server.close(() => resolve());
    });

    process.on('SIGTERM', () => {
      server.close(() => resolve());
    });
  });
}
