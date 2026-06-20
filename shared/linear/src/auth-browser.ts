export type StoredTokens = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  saved_at: number;
};

const STORAGE_KEY = 'linear_tokens';
const PKCE_VERIFIER_KEY = 'linear_pkce_verifier';
const PKCE_STATE_KEY = 'linear_pkce_state';

export function readStoredTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export function writeStoredTokens(tokens: StoredTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function clearStoredTokens(): void {
  localStorage.removeItem(STORAGE_KEY);
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

export async function loadAccessToken(clientId: string): Promise<string> {
  const stored = readStoredTokens();
  if (!stored) {
    throw new Error('Not authenticated. Please log in.');
  }

  if (stored.refresh_token && isTokenExpired(stored)) {
    const refreshed = await refreshAccessToken(stored.refresh_token, clientId);
    writeStoredTokens(refreshed);
    return refreshed.access_token;
  }

  return stored.access_token;
}

// ── PKCE helpers (Web Crypto API — works in browsers and Node 18+) ───────────

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function generateCodeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64urlEncode(bytes.buffer);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return base64urlEncode(digest);
}

export function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── OAuth flow ────────────────────────────────────────────────────────────────

export async function buildAuthUrl(clientId: string, redirectUri: string): Promise<string> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateState();

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);

  const url = new URL('https://linear.app/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'read,write');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return url.toString();
}

export async function handleOAuthCallback(
  code: string,
  state: string,
  clientId: string,
  redirectUri: string,
): Promise<StoredTokens> {
  const expectedState = sessionStorage.getItem(PKCE_STATE_KEY);
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);

  if (state !== expectedState) {
    throw new Error('State mismatch — possible CSRF attack.');
  }
  if (!verifier) {
    throw new Error('Missing PKCE verifier. Please start the login flow again.');
  }

  sessionStorage.removeItem(PKCE_STATE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);

  const body = new URLSearchParams({
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
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
  const stored: StoredTokens = { ...tokens, saved_at: Date.now() };
  writeStoredTokens(stored);
  return stored;
}
