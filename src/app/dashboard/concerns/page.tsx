import PageContainer from '@/components/layout/page-container';
import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import ConcernsShell from '@/features/concerns/components/concerns-shell';

export const metadata = {
  title: 'Dashboard: Concerns'
};

export default function ConcernsPage() {
  return (
    <DashboardPermissionGate permission='org:concerns:read' areaLabel='Concerns'>
      <PageContainer
        pageTitle='Concerns'
        pageDescription='Student support and intervention workflow with ownership, review dates, and case history.'
      >
        <ConcernsShell />
      </PageContainer>
    </DashboardPermissionGate>
  );
}
