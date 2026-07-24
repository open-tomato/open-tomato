import type { TypedDependency } from '@open-tomato/service-core';

import { createDependency } from '@open-tomato/service-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Creates a Postgres/Drizzle dependency suitable for passing to `createService`.
 *
 * The pool is initialised on `start()` and drained on `stop()`.
 * The typed `db` client is accessible via `deps.get(dbDep)`.
 */
export function createDbDependency(connectionString: string): TypedDependency<Db> {
  const pool = new Pool({ connectionString, max: 10 });
  const db = drizzle({ client: pool, schema });

  return createDependency({
    name: 'postgres',
    client: db,
    async onStart() {
      // Probe the connection eagerly so startup fails fast if DB is unreachable
      const client = await pool.connect();
      client.release();
    },
    async onStop() {
      await pool.end();
    },
    healthDetail() {
      return {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount,
      };
    },
  });
}
