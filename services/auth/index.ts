import { Buffer } from 'node:buffer';
import process from 'node:process';

import { errorHandler } from '@open-tomato/errors';
import { createService } from '@open-tomato/express';

import { createDbDependency } from './src/db/index.js';
import { createMailTransport } from './src/mail/transport.js';
import { createRedisDependency } from './src/redis/index.js';
import { introspectRouter } from './src/routes/introspect.js';
import { resetRouter } from './src/routes/reset.js';
import { signInRouter } from './src/routes/sign-in.js';
import { tokenRouter } from './src/routes/token.js';
import { twoFactorRouter } from './src/routes/two-factor.js';
import { createTokenIssuer } from './src/tokens/issuer.js';

// ---------------------------------------------------------------------------
// Environment (D-CFG: inline process.env, the service convention)
// ---------------------------------------------------------------------------

const PORT = Number(process.env['PORT'] ?? 4500);
const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://auth:auth@localhost:5435/auth';
const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6380';
// Transactional mail (reset codes). Unset → console stub (see mail/transport).
const MAIL_URL = process.env['MAIL_URL'];

// HS256 shared secret (D-JWT). Fail CLOSED: the well-known dev default is only
// permitted in explicit local contexts (`NODE_ENV` development/test). Anywhere
// else — including an unset/unknown NODE_ENV — a real secret of adequate length
// is required, so a misconfigured deploy refuses to boot rather than silently
// signing (and introspecting) with a public string an attacker could forge with.
const DEV_JWT_SECRET = 'dev-only-insecure-auth-secret-change-me';
const MIN_SECRET_BYTES = 32;
const NODE_ENV = process.env['NODE_ENV'];
const IS_LOCAL = NODE_ENV === 'development' || NODE_ENV === 'test';
const providedSecret = process.env['AUTH_JWT_SECRET'];

if (!IS_LOCAL) {
  if (providedSecret == null || providedSecret === DEV_JWT_SECRET) {
    throw new Error('AUTH_JWT_SECRET must be set to a strong secret outside development/test');
  }
  if (Buffer.byteLength(providedSecret, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error(`AUTH_JWT_SECRET must be at least ${MIN_SECRET_BYTES} bytes`);
  }
}

const AUTH_JWT_SECRET = providedSecret ?? DEV_JWT_SECRET;

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

const dbDep = createDbDependency(DATABASE_URL);
const redisDep = createRedisDependency(REDIS_URL);

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

await createService({
  serviceId: 'auth',
  port: PORT,
  dependencies: [dbDep, redisDep],

  register(app, ctx) {
    const db = ctx.deps.get(dbDep);
    const redis = ctx.deps.get(redisDep);
    const issuer = createTokenIssuer(AUTH_JWT_SECRET);
    const mail = createMailTransport(MAIL_URL);
    const routeDeps = { db, redis, issuer, mail };

    app.use('/sign-in', signInRouter(routeDeps));
    app.use('/token', tokenRouter(routeDeps));
    app.use('/introspect', introspectRouter(routeDeps));
    app.use('/reset', resetRouter(routeDeps));
    app.use('/2fa', twoFactorRouter(routeDeps));

    // Typed error handler (@open-tomato/errors) — mounted last so it catches
    // ValidationError / UnauthorizedError from the routes above with the
    // structured { code, message, details } body, ahead of the chassis default.
    app.use(errorHandler(ctx.logger));
  },
});
