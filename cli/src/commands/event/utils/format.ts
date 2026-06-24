/**
 * Terminal formatting helpers for event output.
 */

export interface EventRow {
  id: string;
  entity_kind: string;
  event_type: string;
  payload: unknown;
  created_at: string | Date;
}

/**
 * Pretty-prints an event row in the format: [id] [type] [payload] [createdAt]
 */
export function formatEvent(event: EventRow): string {
  const id = event.id.slice(0, 8);
  const kind = event.entity_kind.padEnd(10);
  const type = event.event_type.padEnd(22);
  const createdAt = new Date(event.created_at).toISOString();
  const payload = JSON.stringify(event.payload);
  return `[${id}] [${kind}] [${type}] [${createdAt}]\n  ${payload}`;
}

/**
 * Formats a list of events for terminal output.
 */
export function formatEventList(events: EventRow[]): string {
  if (events.length === 0) return '(no events)';
  return events.map(formatEvent).join('\n\n');
}

/**
 * Prints a validation error to stderr in a consistent format.
 */
export function printValidationError(label: string, issues: Array<{ message: string; path?: (string | number)[] }>): void {
  console.error(`Validation error: ${label}`);
  for (const issue of issues) {
    const path = issue.path?.join('.') ?? '(root)';
    console.error(`  ${path}: ${issue.message}`);
  }
}

/**
 * Formats an axios error for terminal output.
 */
export function formatAxiosError(err: unknown): string {
  if (
    err !== null &&
    typeof err === 'object' &&
    'response' in err &&
    err.response !== null &&
    typeof err.response === 'object' &&
    'data' in err.response
  ) {
    return JSON.stringify((err as { response: { data: unknown } }).response.data, null, 2);
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
