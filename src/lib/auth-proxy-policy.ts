const AUTH_PATHS = new Set([
  '/api/auth/ok',
  '/api/auth/get-session',
  '/api/auth/sign-in/email',
  '/api/auth/sign-up/email',
  '/api/auth/sign-out',
  '/api/auth/update-user',
  '/api/auth/change-password',
  '/api/auth/convex/token',
  '/api/auth/convex/jwks',
  '/api/auth/convex/.well-known/openid-configuration'
]);

export function isAllowedAuthRequest(pathname: string, method: string): boolean {
  if (!AUTH_PATHS.has(pathname) || pathname.includes('\\') || pathname.includes('%')) return false;
  if (pathname.includes('password-reset') || pathname.includes('forget-password')) return false;
  return (
    method === 'POST' ||
    (method === 'GET' &&
      [
        '/api/auth/ok',
        '/api/auth/get-session',
        '/api/auth/convex/jwks',
        '/api/auth/convex/.well-known/openid-configuration'
      ].includes(pathname))
  );
}

export function hasTrustedMutationOrigin(request: Request, configuredOrigin: string | undefined) {
  if (!configuredOrigin) return false;
  try {
    const canonical = new URL(configuredOrigin);
    if (canonical.origin !== configuredOrigin || configuredOrigin.endsWith('/')) return false;
  } catch {
    return false;
  }
  return (
    request.headers.get('origin') === configuredOrigin &&
    request.headers.get('content-type')?.toLowerCase().startsWith('application/json') === true
  );
}
