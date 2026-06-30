import PageContainer from '@/components/layout/page-container';
import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import AttendanceShell from '@/features/attendance/components/attendance-shell';

export const metadata = {
  title: 'Dashboard: Attendance'
};

export default function AttendancePage() {
  return (
    <DashboardPermissionGate permission='org:attendance:read' areaLabel='Attendance'>
      <PageContainer
        pageTitle='Attendance'
        pageDescription='Operational class-day attendance marking for Schly.'
      >
        <AttendanceShell />
      </PageContainer>
    </DashboardPermissionGate>
  );
}
