import { getAuthServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const authServer = getAuthServer();
  if (!(await authServer.isAuthenticated())) {
    return redirect('/auth/sign-in');
  } else {
    redirect('/dashboard/overview');
  }
}
