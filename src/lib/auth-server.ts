import { convexBetterAuthNextJs } from '@convex-dev/better-auth/nextjs';
import { requirePublicAuthConfig } from '@/lib/auth-server-config';

type AuthServer = ReturnType<typeof convexBetterAuthNextJs>;
let authServer: AuthServer | undefined;

export function getAuthServer(): AuthServer {
  if (authServer) return authServer;
  const { convexUrl, convexSiteUrl } = requirePublicAuthConfig();
  authServer = convexBetterAuthNextJs({ convexUrl, convexSiteUrl });
  return authServer;
}
