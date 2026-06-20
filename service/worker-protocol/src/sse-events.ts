/**
 * SSE event types for the task-worker streaming protocol.
 *
 * Both the HTTP server mode (SSE over HTTP) and the CLI mode (NDJSON on
 * stdout) emit events matching these shapes. The executor parses them
 * to reconstruct a `WorkerProcess`-compatible interface.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const SseStdoutEventSchema = z.object({
  stream: z.literal('stdout'),
  line: z.string(),
});

export const SseStderrEventSchema = z.object({
  stream: z.literal('stderr'),
  line: z.string(),
});

export const SseExitEventSchema = z.object({
  exit: z.number().int(),
});

export const SseErrorEventSchema = z.object({
  error: z.string(),
});

export const SseEventSchema = z.discriminatedUnion('stream', [
  SseStdoutEventSchema,
  SseStderrEventSchema,
]).or(SseExitEventSchema)
  .or(SseErrorEventSchema);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type SseStdoutEvent = z.infer<typeof SseStdoutEventSchema>;
export type SseStderrEvent = z.infer<typeof SseStderrEventSchema>;
export type SseExitEvent = z.infer<typeof SseExitEventSchema>;
export type SseErrorEvent = z.infer<typeof SseErrorEventSchema>;

export type SseEvent =
  | SseStdoutEvent
  | SseStderrEvent
  | SseExitEvent
  | SseErrorEvent;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isSseStdoutEvent(event: unknown): event is SseStdoutEvent {
  return SseStdoutEventSchema.safeParse(event).success;
}

export function isSseStderrEvent(event: unknown): event is SseStderrEvent {
  return SseStderrEventSchema.safeParse(event).success;
}

export function isSseExitEvent(event: unknown): event is SseExitEvent {
  return SseExitEventSchema.safeParse(event).success;
}

export function isSseErrorEvent(event: unknown): event is SseErrorEvent {
  return SseErrorEventSchema.safeParse(event).success;
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

/** Formats an event as an SSE `data:` line (for HTTP mode). */
export function toSseLine(event: SseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Formats an event as an NDJSON line (for CLI mode). */
export function toNdjsonLine(event: SseEvent): string {
  return `${JSON.stringify(event)}\n`;
}
