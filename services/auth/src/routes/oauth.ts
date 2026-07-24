/**
 * OAuth/OIDC routes (09c) — provider-agnostic authorization-code + PKCE, Google
 * as the only configured provider (others → 501, per D-OAUTH).
 *
 * `GET  /sign-in/oauth/:provider`           — initiate: mint state/nonce/PKCE,
 *   stash them server-side, 302 to the provider's authorization endpoint.
 * `GET  /sign-in/oauth/:provider/callback`  — validate `state` (CSRF, single-use)
 *   + `nonce`, exchange `code`+PKCE server-side, resolve the identity:
 *     `ok` (linked) · `needs_profile` (new — sets a pending-federation cookie) ·
 *     `denied` (provider refusal / unverifiable).
 * `POST /sign-up/oauth/:provider/complete`  — provision the account from the
 *   cookie-carried verified identity + chosen handle: `ok` · `email_taken`.
 *
 * The browser never sees `code` or the client secret. The result union is
 * returned as JSON; wiring the browser redirect back to the webapp is 09d.
 */
import type { RouteDeps } from './context.js';
import type { FederationSigner } from '../oauth/pending-federation.js';
import type { OAuthProviderRegistry } from '../oauth/providers.js';
import type { Request, Response, NextFunction } from 'express';

import { BadRequestError, zodToValidationError } from '@open-tomato/errors';
import { Router } from 'express';
import { z } from 'zod';

import {
  buildAuthorizationUrl,
  codeChallengeS256,
  exchangeCodeForIdentity,
  generateCodeVerifier,
  generateNonce,
  generateState,
} from '../oauth/oidc.js';
import { PENDING_FED_COOKIE } from '../oauth/pending-federation.js';
import { getOAuthAccountUserId, linkOAuthAccount } from '../store/oauth-accounts.js';
import { consumeOAuthState, putOAuthState, OAUTH_STATE_TTL_SECONDS } from '../store/oauth-state.js';
import { getUserById, createUser } from '../store/users.js';
import { issueTokenSet } from '../tokens/session-tokens.js';

export interface OAuthWiring {
  providers: OAuthProviderRegistry;
  federation: FederationSigner;
  /** Set the `Secure` attribute on the pending-federation cookie (off in tests). */
  secureCookies: boolean;
}

const CallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

const CompleteSchema = z.object({
  provider: z.string().optional(),
  username: z.string().min(1),
  displayName: z.string().min(1),
});

/** Provider not wired (unknown or missing creds) → advertise not-implemented. */
function notImplemented(res: Response): void {
  res.status(501).json({ status: 'not_implemented', message: 'This OAuth provider is not enabled.' });
}

/** Read one cookie by name from the raw header (no cookie-parser dependency). */
function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (header == null) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

export function oauthRouter(deps: RouteDeps, wiring: OAuthWiring): Router {
  const router = Router({ mergeParams: true });
  const { db, redis, issuer } = deps;
  const { providers, federation, secureCookies } = wiring;

  // --- Initiate ------------------------------------------------------------
  router.get('/sign-in/oauth/:provider', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = req.params.provider ?? '';
      const config = providers.get(provider);
      if (config == null) return notImplemented(res);

      const state = generateState();
      const nonce = generateNonce();
      const codeVerifier = generateCodeVerifier();

      await putOAuthState(redis, state, { provider: config.provider, nonce, codeVerifier });

      res.redirect(302, buildAuthorizationUrl(config, {
        state, nonce, codeChallenge: codeChallengeS256(codeVerifier),
      }));
    } catch (err) {
      next(err);
    }
  });

  // --- Callback ------------------------------------------------------------
  router.get('/sign-in/oauth/:provider/callback', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = req.params.provider ?? '';
      const config = providers.get(provider);
      if (config == null) return notImplemented(res);

      const parsed = CallbackQuerySchema.safeParse(req.query);
      if (!parsed.success) throw zodToValidationError(parsed.error);
      const { code, state, error } = parsed.data;

      // The user declined consent at the provider.
      if (error != null) {
        res.status(200).json({ status: 'denied', reason: 'The sign-in was cancelled at the provider.' });
        return;
      }
      if (code == null || state == null) throw new BadRequestError('Missing code or state');

      // Single-use CSRF/replay guard: the state must match one we issued, and
      // for this provider.
      const flow = await consumeOAuthState(redis, state);
      if (flow == null || flow.provider !== config.provider) {
        throw new BadRequestError('Invalid or expired sign-in state');
      }

      // Server-side code+PKCE exchange + id_token verification (incl. nonce).
      const identity = await exchangeCodeForIdentity(config, {
        code, codeVerifier: flow.codeVerifier, expectedNonce: flow.nonce,
      });
      // Reject an unverifiable exchange, and (defense in depth beyond
      // identityFromClaims) any identity whose email the provider hasn't verified.
      if (identity == null || !identity.emailVerified) {
        res.status(200).json({ status: 'denied', reason: 'Could not verify the sign-in.' });
        return;
      }

      // Already linked → straight in.
      const linkedUserId = await getOAuthAccountUserId(db, config.provider, identity.providerUid);
      if (linkedUserId != null) {
        const user = await getUserById(db, linkedUserId);
        if (user != null) {
          const tokens = await issueTokenSet(redis, issuer, {
            sub: user.id, email: user.email, name: user.name, amr: [`oauth:${config.provider}`],
          });
          res.status(200).json({ status: 'ok', tokens });
          return;
        }
      }

      // First sign-in with this provider → collect a handle. Stash the verified
      // identity in a short-lived, signed, httpOnly cookie for `complete`.
      res.cookie(PENDING_FED_COOKIE, await federation.sign(identity), {
        httpOnly: true,
        secure: secureCookies,
        sameSite: 'lax',
        maxAge: OAUTH_STATE_TTL_SECONDS * 1000,
        path: '/',
      });
      res.status(200).json({
        status: 'needs_profile',
        provider: config.provider,
        suggested: { id: '', email: identity.email, name: identity.name, handle: '' },
      });
    } catch (err) {
      next(err);
    }
  });

  // --- Federated sign-up completion ---------------------------------------
  router.post('/sign-up/oauth/:provider/complete', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = req.params.provider ?? '';
      const config = providers.get(provider);
      if (config == null) return notImplemented(res);

      const parsed = CompleteSchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);
      const { username, displayName } = parsed.data;

      // The verified identity comes ONLY from the cookie the callback signed —
      // never the request body.
      const cookie = readCookie(req, PENDING_FED_COOKIE);
      const identity = cookie == null
        ? null
        : await federation.verify(cookie);
      if (identity == null || identity.provider !== config.provider) {
        throw new BadRequestError('No pending federation; restart the OAuth sign-in');
      }

      // email_taken covers: the federated identity is already linked, OR the
      // email already has an account. Check the link first, then the user.
      const alreadyLinked = await getOAuthAccountUserId(db, config.provider, identity.providerUid);
      if (alreadyLinked != null) {
        res.status(200).json({ status: 'email_taken' });
        return;
      }

      const user = await createUser(db, { email: identity.email, name: displayName });
      if (user == null) {
        res.status(200).json({ status: 'email_taken' });
        return;
      }

      const linked = await linkOAuthAccount(db, {
        userId: user.id, provider: config.provider, providerUid: identity.providerUid,
      });
      if (!linked) {
        res.status(200).json({ status: 'email_taken' });
        return;
      }

      res.clearCookie(PENDING_FED_COOKIE, { path: '/' });

      const tokens = await issueTokenSet(redis, issuer, {
        sub: user.id, email: user.email, name: user.name, amr: [`oauth:${config.provider}`],
      });
      res.status(200).json({
        status: 'ok',
        user: { id: user.id, email: user.email, name: displayName, handle: username },
        tokens,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
