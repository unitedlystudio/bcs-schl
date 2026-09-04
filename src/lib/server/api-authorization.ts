import { api } from '../../../convex/_generated/api';
import { hasTrustedMutationOrigin as checkTrustedMutationOrigin } from '@/lib/auth-proxy-policy';
import { getAuthServer } from '@/lib/auth-server';
import type { DashboardPermissionKey } from '@/lib/school-permissions';
import { requirePublicAuthConfig } from '@/lib/auth-server-config';

export async function authorizeApi(permission: DashboardPermissionKey): Promise<boolean> {
  const authServer = getAuthServer();
  if (!(await authServer.isAuthenticated())) return false;
  try {
    return await authServer.fetchAuthQuery(api.viewer.assertPermission, { permission });
  } catch {
    return false;
  }
}

export function hasTrustedMutationOrigin(request: Request): boolean {
  return checkTrustedMutationOrigin(request, requirePublicAuthConfig().siteUrl);
}
