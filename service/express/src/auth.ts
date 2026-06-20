import type { ServiceLogger } from '@open-tomato/service-core';
import type { RequestHandler } from 'express';

/** Middleware that unconditionally calls `next()` — used as a no-op passthrough. */
export const passthroughMiddleware: RequestHandler = (_req, _res, next) => next();

/**
 * Builds middleware that requires a valid session.
 *
 * @param introspectUrl - The token introspection endpoint URL.
 * @param logger - Service logger instance.
 * @returns A middleware that enforces authentication.
 *
 * @remarks Currently a stub that calls `next()`. Full implementation pending the dedicated auth issue.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildRequireAuth(_introspectUrl: string, _logger: ServiceLogger): RequestHandler {
  // TODO(OPT-auth): implement session introspection against introspectUrl
  return passthroughMiddleware;
}

/**
 * Builds middleware that optionally validates a session.
 *
 * @param introspectUrl - The token introspection endpoint URL.
 * @param logger - Service logger instance.
 * @returns A middleware that attaches auth info when a session is present, without rejecting unauthenticated requests.
 *
 * @remarks Currently a stub that calls `next()`. Full implementation pending the dedicated auth issue.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildOptionalAuth(_introspectUrl: string, _logger: ServiceLogger): RequestHandler {
  // TODO(OPT-auth): implement optional session introspection against introspectUrl
  return passthroughMiddleware;
}
