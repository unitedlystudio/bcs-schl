import { NextResponse } from 'next/server';
import { claimTrustedDashboardInvite } from '@/lib/server/trusted-dashboard-access';

export async function POST() {
  try {
    const result = await claimTrustedDashboardInvite();

    if (!result) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to claim trusted dashboard invite', error);
    return NextResponse.json({ error: 'Failed to claim dashboard invite' }, { status: 500 });
  }
}
