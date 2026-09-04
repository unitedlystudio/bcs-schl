import { describe, expect, it } from 'vitest';
import { authCookieHeaders, createSafeTokenReader } from '../../src/lib/auth-server-headers';

describe('server auth header sanitization', () => {
  it('forwards only the session cookie to the Convex token endpoint', () => {
    const incoming = new Headers({
      cookie: 'better-auth.session_token=secret-session',
      host: 'bcs-schl.vercel.app',
      'x-forwarded-host': 'bcs-schl.vercel.app',
      'x-forwarded-proto': 'https',
      authorization: 'Bearer unrelated'
    });

    const sanitized = authCookieHeaders(incoming);

    expect([...sanitized.entries()]).toEqual([
      ['cookie', 'better-auth.session_token=secret-session']
    ]);
  });

  it('returns empty headers when no cookie is present', () => {
    expect([...authCookieHeaders(new Headers({ host: 'bcs-schl.vercel.app' })).entries()]).toEqual(
      []
    );
  });

  it('sanitizes the real token-reader boundary on every request', async () => {
    const seen: Array<Array<[string, string]>> = [];
    const read = createSafeTokenReader(
      async () =>
        new Headers({
          cookie: 'better-auth.session_token=current-account',
          host: 'bcs-schl.vercel.app',
          'x-forwarded-host': 'bcs-schl.vercel.app'
        }),
      async (safeHeaders) => {
        seen.push([...safeHeaders.entries()]);
        safeHeaders.set('host', 'clear-wren-571.convex.site');
        return 'convex-jwt';
      }
    );

    await expect(read()).resolves.toBe('convex-jwt');
    expect(seen).toEqual([[['cookie', 'better-auth.session_token=current-account']]]);
  });
});
