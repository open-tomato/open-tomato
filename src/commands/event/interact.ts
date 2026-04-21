#!/usr/bin/env bun
/**
 * tomato event interact
 *
 * Interactive terminal UI for the notification service event CLI.
 * Provides guided flows for send, listen, and read commands.
 *
 * Usage:
 *   tomato event interact [-p <port>] [-h]
 *
 * Flags:
 *   -p, --port <number>   Notification service port (default: 4400).
 *   -h, --help            Show this help message.
 *
 * Note: This is a basic interactive terminal intended to grow into a proper TUI.
 */

import type { EntityKind } from './utils/config.js';
import type { EventRow } from './utils/format.js';
import type { Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import process from 'node:process';

import express from 'express';
import inquirer from 'inquirer';
import { z } from 'zod';

import { getBoolFlag, getNumberFlag, parseArgs } from './utils/args.js';
import { createClient } from './utils/client.js';
import { DEFAULT_LISTEN_PORT, ENTITY_KINDS, isEntityKind } from './utils/config.js';
import { formatAxiosError, formatEvent, formatEventList, printValidationError } from './utils/format.js';
import {
  entitySchemas,
  EventEnvelopeSchema,
  getEventTypesForKind,
} from './utils/schemas.js';

const HELP = `
Usage: tomato event interact [options]

Interactive terminal UI for the notification service.

Options:
  -p, --port <number>   Notification service port (default: 4400)
  -h, --help            Show this help message
`;

const EXIT = '__exit__';
const BACK = '__back__';

// ── Schema introspection ──────────────────────────────────────────────────────

interface FieldQuestion {
  name: string;
  type: 'input' | 'number' | 'confirm' | 'select' | 'checkbox';
  message: string;
  choices?: Array<{ name: string; value: string }>;
  default?: unknown;
  required?: boolean;
}

/**
 * Converts a Zod object schema into a list of inquirer-compatible question descriptors.
 * Handles string, number, boolean, enum, and array-of-string fields.
 * Unknown or complex types fall back to a free-form text input.
 */
function zodObjectToQuestions(schema: ZodTypeAny, prefix = ''): FieldQuestion[] {
  const questions: FieldQuestion[] = [];

  // Unwrap ZodOptional / ZodDefault
  let inner = schema;
  let isOptional = false;
  while (
    inner._def.typeName === 'ZodOptional' ||
    inner._def.typeName === 'ZodDefault'
  ) {
    isOptional = true;
    inner = (inner._def as { innerType?: ZodTypeAny; schema?: ZodTypeAny }).innerType
      ?? (inner._def as { innerType?: ZodTypeAny; schema?: ZodTypeAny }).schema
      ?? inner;
  }

  if (inner._def.typeName !== 'ZodObject') return questions;

  const shape = (inner._def as { shape: () => Record<string, ZodTypeAny> }).shape();

  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (key === 'type') continue; // event type already selected earlier

    const fullName = prefix
      ? `${prefix}.${key}`
      : key;
    let fieldInner: ZodTypeAny = fieldSchema;
    let fieldOptional = isOptional;

    while (
      fieldInner._def.typeName === 'ZodOptional' ||
      fieldInner._def.typeName === 'ZodDefault'
    ) {
      fieldOptional = true;
      fieldInner = (fieldInner._def as { innerType?: ZodTypeAny; schema?: ZodTypeAny }).innerType
        ?? (fieldInner._def as { innerType?: ZodTypeAny; schema?: ZodTypeAny }).schema
        ?? fieldInner;
    }

    const label = `${fullName}${fieldOptional
      ? ' (optional)'
      : ''}`;

    switch (fieldInner._def.typeName) {
      case 'ZodString':
        questions.push({ name: fullName, type: 'input', message: label, required: !fieldOptional });
        break;

      case 'ZodNumber':
        questions.push({ name: fullName, type: 'number', message: label, required: !fieldOptional });
        break;

      case 'ZodBoolean':
        questions.push({ name: fullName, type: 'confirm', message: label, default: false });
        break;

      case 'ZodEnum': {
        const values = (fieldInner._def as { values: string[] }).values;
        questions.push({
          name: fullName,
          type: 'select',
          message: label,
          choices: values.map((v) => ({ name: v, value: v })),
          required: !fieldOptional,
        });
        break;
      }

      case 'ZodArray': {
        // Only handle string arrays as free-form comma-separated input for now
        questions.push({
          name: fullName,
          type: 'input',
          message: `${label} (comma-separated)`,
          required: !fieldOptional,
        });
        break;
      }

      default:
        questions.push({
          name: fullName,
          type: 'input',
          message: `${label} (JSON)`,
          required: !fieldOptional,
        });
    }
  }

  return questions;
}

/**
 * Builds the payload object from answers.
 * Handles dot-separated nested keys and comma-separated array values.
 */
function buildPayloadFromAnswers(
  answers: Record<string, unknown>,
  schema: ZodTypeAny,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(answers)) {
    if (value === '' || value === undefined) continue;

    // Detect if this field was rendered as comma-separated array
    const fieldSchema = getFieldSchema(schema, key);
    if (fieldSchema?._def.typeName === 'ZodArray' && typeof value === 'string') {
      result[key] = value.split(',').map((v) => v.trim())
        .filter(Boolean);
    } else if (typeof value === 'string' && value.startsWith('{')) {
      try {
        result[key] = JSON.parse(value) as unknown;
      } catch {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

function getFieldSchema(schema: ZodTypeAny, key: string): ZodTypeAny | undefined {
  let inner = schema;
  while (inner._def.typeName === 'ZodOptional' || inner._def.typeName === 'ZodDefault') {
    inner = (inner._def as { innerType?: ZodTypeAny; schema?: ZodTypeAny }).innerType
      ?? (inner._def as { innerType?: ZodTypeAny; schema?: ZodTypeAny }).schema
      ?? inner;
  }
  if (inner._def.typeName !== 'ZodObject') return undefined;
  const shape = (inner._def as { shape: () => Record<string, ZodTypeAny> }).shape();
  return shape[key];
}

// ── Send flow ─────────────────────────────────────────────────────────────────

async function runSend(client: ReturnType<typeof createClient>): Promise<void> {
  // 1. Select entity kind
  const { kind } = await inquirer.prompt<{ kind: EntityKind | '__back__' }>({
    kind: {
      type: 'select',
      message: 'Select entity kind',
      choices: [
        ...ENTITY_KINDS.map((k) => ({ name: k, value: k })),
        new inquirer.Separator(),
        { name: 'Back', value: BACK },
      ],
    },
  });
  if (kind === BACK) return;
  if (!isEntityKind(kind)) return;

  // 2. Validation toggle (checked by default)
  const { validate } = await inquirer.prompt<{ validate: boolean }>({
    validate: {
      type: 'confirm',
      message: 'Validate payload before sending?',
      default: true,
    },
  });

  // 3. Select event type
  const knownTypes = getEventTypesForKind(kind);
  let eventType: string;

  if (knownTypes.length > 0) {
    const { selectedType } = await inquirer.prompt<{ selectedType: string }>({
      selectedType: {
        type: 'select',
        message: 'Select event type',
        choices: knownTypes.map((t) => ({ name: t, value: t })),
      },
    });
    eventType = selectedType;
  } else {
    const { typedType } = await inquirer.prompt<{ typedType: string }>({
      typedType: {
        type: 'input',
        message: 'Event type',
      },
    });
    eventType = typedType;
  }

  // 4. Build questions from schema
  const baseSchema = entitySchemas[kind];
  let payloadSchema: ZodTypeAny = baseSchema;

  // For discriminated unions, find the matching variant
  if (baseSchema._def.typeName === 'ZodDiscriminatedUnion') {
    const options = (baseSchema._def as { options: ZodTypeAny[] }).options;
    const match = options.find((opt) => {
      const shape = (opt._def as { shape: () => Record<string, ZodTypeAny> }).shape?.();
      const typeField = shape?.['type'];
      if (!typeField) return false;
      const typeDef = typeField._def as { value?: string };
      return typeDef.value === eventType;
    });
    if (match) payloadSchema = match;
  }

  const questions = zodObjectToQuestions(payloadSchema);

  let payloadAnswers: Record<string, unknown> = {};
  if (questions.length > 0) {
    const questionMap = Object.fromEntries(
      questions.map((q) => [
        q.name,
        {
          type: q.type,
          message: q.message,
          ...(q.choices
            ? { choices: q.choices }
            : {}),
          ...(q.default !== undefined
            ? { default: q.default }
            : {}),
        },
      ]),
    );
    payloadAnswers = await inquirer.prompt<Record<string, unknown>>(questionMap);
  }

  const payload = buildPayloadFromAnswers(payloadAnswers, payloadSchema);
  const jobId = randomUUID();
  const nodeIdResult = spawnSync('whoami', [], { encoding: 'utf8' });
  const nodeId = `events-cli-${nodeIdResult.stdout?.trim() ?? 'unknown'}`;
  const body = { jobId, nodeId, type: eventType, ...payload };

  // 5. Validate locally if requested
  if (validate) {
    const envelopeResult = EventEnvelopeSchema.safeParse(body);
    if (!envelopeResult.success) {
      printValidationError('Invalid envelope', envelopeResult.error.issues);
      await pressEnterToContinue();
      return;
    }
    const payloadResult = payloadSchema.safeParse(body);
    if (!payloadResult.success) {
      printValidationError(`Invalid payload for kind "${kind}"`, payloadResult.error.issues);
      await pressEnterToContinue();
      return;
    }
  }

  // 6. Send
  try {
    const response = await client.post(`/events/${kind}`, body);
    console.log('\nEvent sent successfully.');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('\nFailed to send event:');
    console.error(formatAxiosError(err));
  }

  await pressEnterToContinue();
}

// ── Listen flow ───────────────────────────────────────────────────────────────

async function runListen(): Promise<void> {
  const { useCallback } = await inquirer.prompt<{ useCallback: boolean }>({
    useCallback: {
      type: 'confirm',
      message: 'Start in callback mode? (listen on a specific path only)',
      default: false,
    },
  });

  let callbackPath: string | undefined;
  if (useCallback) {
    const { path } = await inquirer.prompt<{ path: string }>({
      path: {
        type: 'input',
        message: 'Callback path',
        default: '/events',
      },
    });
    callbackPath = path;
  }

  const { port } = await inquirer.prompt<{ port: number }>({
    port: {
      type: 'number',
      message: 'Local server port',
      default: DEFAULT_LISTEN_PORT,
    },
  });

  const app = express();
  app.use(express.json());
   
  app.post('*', (req: Request, res: Response) => {
    const reqPath = req.path;

    if (callbackPath && reqPath !== callbackPath) {
      console.warn(`[WARN] Unexpected path: POST ${reqPath} — expected ${callbackPath}`);
      res.status(404).json({ error: `Not found: ${reqPath}` });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const envelopeResult = EventEnvelopeSchema.safeParse(body);

    if (!envelopeResult.success) {
      printValidationError(`Envelope validation failed on POST ${reqPath}`, envelopeResult.error.issues);
      res.status(400).json({ error: 'Invalid envelope', issues: envelopeResult.error.issues });
      return;
    }

    const kindRaw = String(body['entityKind'] ?? body['kind'] ?? 'unknown');
    const schema = isEntityKind(kindRaw)
      ? entitySchemas[kindRaw]
      : undefined;

    if (schema) {
      const payloadResult = schema.safeParse(body);
      if (!payloadResult.success) {
        printValidationError(`Payload validation failed for kind "${kindRaw}"`, payloadResult.error.issues);
        res.status(400).json({ error: 'Invalid payload', issues: payloadResult.error.issues });
        return;
      }
    } else {
      console.warn(`[WARN] Unknown entity kind "${kindRaw}" — skipping payload validation`);
    }

    const event = {
      id: (body['jobId'] as string | undefined) ?? '(no-id)',
      entity_kind: kindRaw,
      event_type: (body['type'] as string | undefined) ?? '(unknown)',
      payload: body,
      created_at: new Date().toISOString(),
    };
    console.log('\nEvent received:');
    console.log(formatEvent(event));

    res.status(200).json({ ok: true });
  });

  console.log('\nPress Ctrl+C to stop listening and return to the main menu.\n');

  await new Promise<void>((resolve) => {
    const server = app.listen(port, () => {
      const mode = callbackPath
        ? `callback mode — ${callbackPath}`
        : 'open mode (all paths)';
      console.log(`Listening on http://localhost:${port} [${mode}]`);
    });

    process.once('SIGINT', () => {
      console.log('\nStopping listener…');
      server.close(() => resolve());
    });
  });
}

// ── Read flow ─────────────────────────────────────────────────────────────────

async function runRead(client: ReturnType<typeof createClient>): Promise<void> {
  // 1. Select kinds to fetch
  const { selectedKinds } = await inquirer.prompt<{ selectedKinds: string[] }>({
    selectedKinds: {
      type: 'checkbox',
      message: 'Select entity kinds to fetch (space to toggle, enter to confirm)',
      choices: [
        { name: 'All', value: '__all__', checked: true },
        new inquirer.Separator(),
        ...ENTITY_KINDS.map((k) => ({ name: k, value: k })),
      ],
    },
  });

  if (selectedKinds.length === 0) {
    console.log('No kinds selected.');
    await pressEnterToContinue();
    return;
  }

  const kinds = selectedKinds.includes('__all__')
    ? undefined
    : selectedKinds;

  // 2. Fetch events — each kind fetched separately, combined and sorted
  // NOTE (CLI): Uses stub GET /events endpoint. See read.ts for stub documentation.
  let events: EventRow[] = [];
  try {
    if (kinds) {
      const fetches = await Promise.all(
        kinds.map((k: string) => client.get<EventRow[]>('/events', { params: { kind: k, limit: 20 } })),
      );
      events = fetches.flatMap((r) => r.data);
    } else {
      const response = await client.get<EventRow[]>('/events', { params: { limit: 20 } });
      events = response.data;
    }
  } catch (err) {
    console.error('\nFailed to fetch events:');
    console.error(formatAxiosError(err));
    await pressEnterToContinue();
    return;
  }

  if (events.length === 0) {
    console.log('(no events found)');
    await pressEnterToContinue();
    return;
  }

  // 3. Show as checklist for marking as read
  const { toMark } = await inquirer.prompt<{ toMark: string[] | '__back__' }>({
    toMark: {
      type: 'checkbox',
      message: 'Select events to mark as read (space to toggle)',
      choices: [
        ...events.map((e) => ({
          name: `[${e.id.slice(0, 8)}] [${e.entity_kind}] [${e.event_type}] ${JSON.stringify(e.payload).slice(0, 60)}`,
          value: e.id,
        })),
        new inquirer.Separator(),
        { name: 'Go back without marking read', value: '__back__' },
      ],
    },
  });

  if (!toMark || (toMark as string[]).includes('__back__')) return;

  const ids = toMark as string[];
  if (ids.length === 0) {
    console.log('Nothing selected.');
    await pressEnterToContinue();
    return;
  }

  // NOTE (CLI): Uses stub POST /events/mark-read endpoint. See read.ts for stub documentation.
  try {
    await client.post('/events/mark-read', { ids });
    console.log(`\nMarked ${ids.length} event(s) as read.`);
  } catch (err) {
    console.error('\nFailed to mark events as read:');
    console.error(formatAxiosError(err));
  }

  await pressEnterToContinue();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function pressEnterToContinue(): Promise<void> {
  await inquirer.prompt({
    _: { type: 'input', message: 'Press Enter to return to the main menu…', default: '' },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default async function interact(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);

  if (getBoolFlag(flags, 'h', 'help')) {
    console.log(HELP);
    return;
  }

  const port = getNumberFlag(flags, 'p', 'port');
  const client = createClient(port);

  // suppress unused import — z is used in zodObjectToQuestions via ZodTypeAny at runtime
  void z;

  while (true) {
    console.clear();
    console.log('─── Event CLI ──────────────────────────────────────');

    const { action } = await inquirer.prompt<{ action: string }>({
      action: {
        type: 'select',
        message: 'What would you like to do?',
        choices: [
          { name: 'Send an event', value: 'send' },
          { name: 'Listen for events', value: 'listen' },
          { name: 'Read events', value: 'read' },
          new inquirer.Separator(),
          { name: 'Exit', value: EXIT },
        ],
      },
    });

    if (action === EXIT) break;

    if (action === 'send') {
      await runSend(client);
    } else if (action === 'listen') {
      await runListen();
    } else if (action === 'read') {
      await runRead(client);
    }
  }

  console.log('Goodbye.');
}

// Suppress TypeScript unused-import error for formatEventList (available for future use)
void formatEventList;
