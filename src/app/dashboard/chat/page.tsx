import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import ChatViewPage from '@/features/chat/components/chat-view-page';

export const metadata = {
  title: 'Dashboard: Chat'
};

export default function Page() {
  return (
    <DashboardPermissionGate permission='org:chat:read' areaLabel='Chat'>
      <ChatViewPage />
    </DashboardPermissionGate>
  );
}
