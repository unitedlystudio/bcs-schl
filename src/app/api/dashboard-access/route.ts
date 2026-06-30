import { NextResponse } from 'next/server';
import { getTrustedDashboardAccess } from '@/lib/server/trusted-dashboard-access';

export async function GET() {
  try {
    const access = await getTrustedDashboardAccess();

    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(access);
  } catch (error) {
    console.error('Failed to resolve trusted dashboard access', error);
    return NextResponse.json({ error: 'Failed to resolve dashboard access' }, { status: 500 });
  }
}
