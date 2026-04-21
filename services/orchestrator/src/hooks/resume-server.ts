/**
 * @packageDocumentation
 * Minimal Bun HTTP server that exposes a `POST /resume` endpoint for
 * triggering resume of a suspended orchestration loop.
 *
 * The endpoint writes the `.ralph/resume-requested` signal file into
 * `stateDir`. The suspend strategies poll for this file and resume the
 * loop when it appears.
 *
 * Authorization is enforced via a `Bearer` token read from the
 * `RALPH_RESUME_TOKEN` environment variable. Requests without a valid
 * `Authorization` header are rejected with `401 Unauthorized`.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';

/** Relative path of the resume signal file within `stateDir`. */
const RESUME_SIGNAL = '.ralph/resume-requested';

/** Environment variable name for the resume bearer token. */
const TOKEN_ENV_VAR = 'RALPH_RESUME_TOKEN';

/**
 * Validates a Bearer token from an HTTP `Authorization` header.
 *
 * Returns `false` when `expectedToken` is absent, the header is missing,
 * the scheme is not `Bearer`, or the provided token does not match.
 *
 * @param authHeader - Raw value of the `Authorization` request header.
 * @param expectedToken - Token read from the environment; `undefined` means
 *   no token has been configured and every request should be rejected.
 * @returns `true` when the token is present and matches; `false` otherwise.
 */
function validateBearerToken(
  authHeader: string | null,
  expectedToken: string | undefined,
): boolean {
  if (!expectedToken || !authHeader) return false;
  const prefix = 'Bearer ';
  if (!authHeader.startsWith(prefix)) return false;
  return authHeader.slice(prefix.length) === expectedToken;
}

/**
 * Starts a Bun HTTP server on the given port that exposes `POST /resume`.
 *
 * On a valid authenticated request the server writes the
 * `.ralph/resume-requested` signal file to `stateDir`, which unblocks any
 * {@link waitForResume} or {@link waitThenRetry} strategy running against
 * the same directory.
 *
 * Authentication uses `Authorization: Bearer <token>` where the expected
 * token is read from the `RALPH_RESUME_TOKEN` environment variable. If the
 * variable is not set the endpoint is unreachable and every request receives
 * `401 Unauthorized`.
 *
 * @param port - TCP port to listen on.
 * @param stateDir - Directory under which `.ralph/resume-requested` is written.
 * @returns An object with a `stop()` method that shuts down the server.
 */
export function startResumeServer(
  port: number,
  stateDir: string,
): { stop: () => void } {
  const expectedToken = Bun.env[TOKEN_ENV_VAR];
  const signalPath = path.join(stateDir, RESUME_SIGNAL);

  const server = Bun.serve({
    port,
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);

      if (req.method !== 'POST' || url.pathname !== '/resume') {
        return new Response('Not Found', { status: 404 });
      }

      // Authorization check
      if (!validateBearerToken(req.headers.get('Authorization'), expectedToken)) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Write signal file
      try {
        await mkdir(path.dirname(signalPath), { recursive: true });
        await Bun.write(signalPath, '');
        return new Response('OK', { status: 200 });
      } catch (err: unknown) {
        const message = err instanceof Error
          ? err.message
          : 'Unknown error';
        return new Response(`Internal Server Error: ${message}`, { status: 500 });
      }
    },
  });

  return {
    stop(): void {
      server.stop();
    },
  };
}
