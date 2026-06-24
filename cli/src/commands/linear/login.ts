import { exec } from 'node:child_process';
import http from 'node:http';
import process from 'node:process';

import {
  TOKEN_PATH,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  writeStoredTokens,
  type StoredTokens,
} from '@open-tomato/linear/auth-node';

const REDIRECT_PORT = process.env.OAUTH_REDIRECT_PORT || 80;

const REDIRECT_BASE_URI = `${process.env.OAUTH_REDIRECT_URI || 'http://localhost'}:${REDIRECT_PORT}`;
const REDIRECT_URI = `${REDIRECT_BASE_URI}/oauth/callback`;
const SCOPES = 'read,write';

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  clientId: string,
): Promise<StoredTokens> {
  const body = new URLSearchParams({
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://api.linear.app/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${await response.text()}`);
  }

  const tokens = (await response.json()) as Omit<StoredTokens, 'saved_at'>;
  return { ...tokens, saved_at: Date.now() };
}

function waitForCallback(state: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, REDIRECT_BASE_URI);

      if (url.pathname !== '/oauth/callback') {
        res.writeHead(404);
        res.end();
        return;
      }

      const returnedState = url.searchParams.get('state');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      const send = (status: number, heading: string, detail = '') => {
        res.writeHead(status, { 'Content-Type': 'text/html' });
        res.end(
          `<html><body style="font-family:sans-serif;padding:2rem"><h1>${heading}</h1>${detail}<p>You can close this tab.</p></body></html>`,
        );
        server.close();
      };

      if (error) {
        send(400, 'Authorization failed', `<p>${error}</p>`);
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (returnedState !== state) {
        send(400, 'Invalid state');
        reject(new Error('State mismatch — possible CSRF attack'));
        return;
      }

      if (!code) {
        send(400, 'Missing authorization code');
        reject(new Error('No code in callback'));
        return;
      }

      send(200, '✅ Authorized!', '<p>You can return to your terminal.</p>');
      resolve(code);
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`⏳ Waiting for callback on ${REDIRECT_BASE_URI}...`);
    });

    server.on('error', reject);
  });
}

export default async function login(): Promise<void> {
  const clientId = process.env.LINEAR_CLIENT_ID;
  if (!clientId) {
    console.error('❌ LINEAR_CLIENT_ID is not set. Add it to your .env file.');
    process.exit(1);
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  const authUrl = new URL('https://linear.app/oauth/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  console.log('🔐 Opening Linear authorization in your browser...');
  console.log(`   If it doesn't open automatically:\n   ${authUrl.toString()}\n`);
  openBrowser(authUrl.toString());

  const code = await waitForCallback(state);

  console.log('🔄 Exchanging code for access token...');
  const tokens = await exchangeCodeForToken(code, codeVerifier, clientId);
  writeStoredTokens(tokens);

  console.log(`✅ Logged in! Token saved to ${TOKEN_PATH}`);
}
