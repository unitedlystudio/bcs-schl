import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import SchlyDashboard from '@/features/overview/components/schly-dashboard';

export const metadata = {
  title: 'Dashboard: Schly Overview'
};

export default function OverviewPage() {
  return (
    <DashboardPermissionGate permission='org:overview:read' areaLabel='Dashboard overview'>
      <SchlyDashboard />
    </DashboardPermissionGate>
  );
}
