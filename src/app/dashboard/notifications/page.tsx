import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import NotificationsPage from '@/features/notifications/components/notifications-page';

export const metadata = {
  title: 'Dashboard: Operational Inbox'
};

export default function Page() {
  return (
    <DashboardPermissionGate permission='org:notifications:read' areaLabel='Inbox'>
      <NotificationsPage />
    </DashboardPermissionGate>
  );
}
