const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const INVITE_DOMAIN = 'schly-invite:v1\0';

export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(normalized) ? normalized : '';
}

export function isInviteToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value);
}

export function generateInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

export async function digestInviteToken(token: string, secret: string): Promise<string> {
  if (!isInviteToken(token)) return '';
  if (secret.length < 32)
    throw new Error('INVITE_TOKEN_SECRET must contain at least 32 characters');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${INVITE_DOMAIN}${token}`)
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

export function requireAbsoluteOrigin(value: string | undefined, name: string): string {
  if (!value || value.endsWith('/'))
    throw new Error(`${name} must be an absolute origin without a trailing slash`);
  const url = new URL(value);
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (
    url.origin !== value ||
    (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') ||
    (process.env.NODE_ENV !== 'production' && url.protocol !== 'https:' && !isLocalhost)
  ) {
    throw new Error(
      `${name} must be an exact ${process.env.NODE_ENV === 'production' ? 'HTTPS ' : ''}origin`
    );
  }
  return value;
}

export function safeDashboardPath(value: string | null | undefined): string {
  if (!value) return '/dashboard';
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return '/dashboard';
  }
  if (
    (decoded !== '/dashboard' && !decoded.startsWith('/dashboard/')) ||
    decoded.startsWith('//') ||
    decoded.includes('\\')
  )
    return '/dashboard';
  return decoded;
}
