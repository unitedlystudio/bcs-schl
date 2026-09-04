import { getAuthServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const authServer = getAuthServer();
  if (!(await authServer.isAuthenticated())) {
    return redirect('/auth/sign-in');
  } else {
    redirect('/dashboard');
  }
}
