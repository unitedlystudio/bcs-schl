import { NextResponse } from 'next/server';
import { api } from '../../../../convex/_generated/api';
import { getAuthServer } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export async function GET() {
  const authServer = getAuthServer();
  if (!(await authServer.isAuthenticated()))
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  try {
    const rows = await authServer.fetchAuthQuery(api.teachers.listForDirectory, {});
    return NextResponse.json({ rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
