import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

export type StoredTokens = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  saved_at: number;
};

export const TOKEN_PATH = path.join(os.homedir(), '.config', 'tomato', 'linear.json');

export function readStoredTokens(): StoredTokens | null {
  try {
    if (!fs.existsSync(TOKEN_PATH)) return null;
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')) as StoredTokens;
  } catch {
    return null;
  }
}

export function writeStoredTokens(tokens: StoredTokens): void {
  const dir = path.dirname(TOKEN_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

function isTokenExpired(tokens: StoredTokens): boolean {
  const expiresAt = tokens.saved_at + tokens.expires_in * 1000;
  return Date.now() > expiresAt - 5 * 60 * 1000;
}

async function refreshAccessToken(refreshToken: string, clientId: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const response = await fetch('https://api.linear.app/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${await response.text()}`);
  }

  const tokens = (await response.json()) as Omit<StoredTokens, 'saved_at'>;
  return { ...tokens, saved_at: Date.now() };
}

export async function loadAccessToken(): Promise<string> {
  const stored = readStoredTokens();
  if (!stored) {
    throw new Error('Not authenticated. Run `tomato linear login` or set LINEAR_API_KEY.');
  }

  if (stored.refresh_token && isTokenExpired(stored)) {
    const clientId = process.env.LINEAR_CLIENT_ID;
    if (!clientId) {
      throw new Error('Token expired and LINEAR_CLIENT_ID is not set. Run `tomato linear login` again.');
    }
    const refreshed = await refreshAccessToken(stored.refresh_token, clientId);
    writeStoredTokens(refreshed);
    return refreshed.access_token;
  }

  return stored.access_token;
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier)
    .digest('base64url');
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}
