/**
 * Configuration helpers for the event CLI tool.
 * Resolves service URLs and provides shared constants.
 */

export const ENTITY_KINDS = ['executor', 'mail', 'push', 'reminder', 'prompt', 'webhook'] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export const DEFAULT_SERVICE_PORT = 4400;
export const DEFAULT_LISTEN_PORT = 4000;

/**
 * Returns the base URL of the notification service.
 * Respects NODE_ENV=production when resolving the host (placeholder for future env resolution).
 */
export function getServiceUrl(port: number = DEFAULT_SERVICE_PORT): string {
  return `http://localhost:${port}`;
}

export function isEntityKind(value: string): value is EntityKind {
  return (ENTITY_KINDS as readonly string[]).includes(value);
}
