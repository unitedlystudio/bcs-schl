import { describe, expect, it } from 'vitest';
import { hasTrustedMutationOrigin, isAllowedAuthRequest } from '../../src/lib/auth-proxy-policy';

describe('same-origin auth proxy policy', () => {
  it('allows only required endpoint methods', () => {
    expect(isAllowedAuthRequest('/api/auth/get-session', 'GET')).toBe(true);
    expect(isAllowedAuthRequest('/api/auth/convex/token', 'GET')).toBe(true);
    expect(isAllowedAuthRequest('/api/auth/sign-in/email', 'POST')).toBe(true);
    expect(isAllowedAuthRequest('/api/auth/sign-out', 'GET')).toBe(false);
  });

  it('blocks reset, traversal, and unrelated paths', () => {
    expect(isAllowedAuthRequest('/api/auth/request-password-reset', 'POST')).toBe(false);
    expect(isAllowedAuthRequest('/api/auth/%2e%2e/functions', 'POST')).toBe(false);
    expect(isAllowedAuthRequest('/api/auth/admin/list-users', 'GET')).toBe(false);
  });

  it('fails closed for missing, null, foreign, and non-JSON mutation origins', () => {
    const canonical = 'https://school.example';
    const request = (origin?: string, contentType = 'application/json') =>
      new Request(`${canonical}/api/auth/sign-out`, {
        method: 'POST',
        headers: {
          ...(origin === undefined ? {} : { origin }),
          'content-type': contentType
        }
      });
    expect(hasTrustedMutationOrigin(request(), canonical)).toBe(false);
    expect(hasTrustedMutationOrigin(request('null'), canonical)).toBe(false);
    expect(hasTrustedMutationOrigin(request('https://evil.example'), canonical)).toBe(false);
    expect(hasTrustedMutationOrigin(request(canonical, 'text/plain'), canonical)).toBe(false);
    expect(hasTrustedMutationOrigin(request(canonical), canonical)).toBe(true);
    expect(hasTrustedMutationOrigin(request(canonical), undefined)).toBe(false);
  });
});
