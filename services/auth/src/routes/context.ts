/**
 * Shared wiring passed to every route factory: the Postgres client, the Redis
 * client, and the access-token issuer. Handlers reach persistence only through
 * the `store/*` modules (so tests mock those), never the raw clients directly
 * beyond handing them down.
 */
import type { Db } from '../db/index.js';
import type { MailTransport } from '../mail/transport.js';
import type { RedisClient } from '../redis/index.js';
import type { TokenIssuer } from '../tokens/issuer.js';

export interface RouteDeps {
  db: Db;
  redis: RedisClient;
  issuer: TokenIssuer;
  mail: MailTransport;
}

/** Derive a display handle from an email local-part. The minimal 09a schema
 *  has no `handle` column, so the contract's `UserProfile.handle` is derived. */
export const handleFromEmail = (email: string): string => {
  const [local] = email.split('@');
  return (local ?? email).trim().toLowerCase();
};
