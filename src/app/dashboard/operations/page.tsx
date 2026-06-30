import PageContainer from '@/components/layout/page-container';
import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import OperationsShell from '@/features/operations/components/operations-shell';

export const metadata = {
  title: 'Dashboard: Timetable & Operations'
};

export default function OperationsPage() {
  return (
    <DashboardPermissionGate permission='org:operations:read' areaLabel='Operations'>
      <PageContainer
        pageTitle='Timetable & Operations'
        pageDescription='Weekly class timetable, specialist coverage, lunch flow, and daily operational overrides.'
      >
        <OperationsShell />
      </PageContainer>
    </DashboardPermissionGate>
  );
}
