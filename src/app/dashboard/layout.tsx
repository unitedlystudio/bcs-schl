import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { InfoSidebar } from '@/components/layout/info-sidebar';
import { InfobarProvider } from '@/components/ui/infobar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ApplicationAccessGate } from '@/components/layout/application-access-gate';
import { getAuthServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Schly Dashboard',
  description: 'School operations dashboard for Schly.',
  robots: {
    index: false,
    follow: false
  }
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const authServer = getAuthServer();
  if (!(await authServer.isAuthenticated())) redirect('/auth/sign-in');
  // Persisting the sidebar state in the cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';
  return (
    <ApplicationAccessGate>
      <KBar>
        <SidebarProvider defaultOpen={defaultOpen}>
          <InfobarProvider defaultOpen={false}>
            <AppSidebar />
            <SidebarInset>
              <Header />
              {/* page main content */}
              {children}
              {/* page main content ends */}
            </SidebarInset>
            <InfoSidebar side='right' />
          </InfobarProvider>
        </SidebarProvider>
      </KBar>
    </ApplicationAccessGate>
  );
}
