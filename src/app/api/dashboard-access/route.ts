import { NextResponse } from 'next/server';
import { getTrustedDashboardAccess } from '@/lib/server/trusted-dashboard-access';

export async function GET(request: Request) {
  const requestedOrgId = new URL(request.url).searchParams.get('orgId')?.trim() ?? undefined;

  try {
    const result = await getTrustedDashboardAccess(requestedOrgId);

    if (!result) {
      console.warn('[dashboard-access] trusted access returned null');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.warn('[dashboard-access] resolved', {
      orgId: result.orgId,
      hasManagedProfile: result.hasManagedProfile,
      dashboardRole: result.dashboardRole,
      permissionCount: result.permissions.length,
      permissions: result.permissions,
      managedPermissionCount: result.managedPermissions.length,
      managedPermissions: result.managedPermissions,
      clerkRole: result.clerkRole
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to resolve trusted dashboard access', error);
    return NextResponse.json({ error: 'Failed to resolve dashboard access' }, { status: 500 });
  }
}
