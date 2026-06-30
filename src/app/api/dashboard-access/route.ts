import { NextResponse } from 'next/server';
import { getTrustedDashboardAccess } from '@/lib/server/trusted-dashboard-access';

export async function GET() {
  try {
    const result = await getTrustedDashboardAccess();

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
