import PageContainer from '@/components/layout/page-container';
import AttendanceShell from '@/features/attendance/components/attendance-shell';

export const metadata = {
  title: 'Dashboard: Attendance'
};

export default function AttendancePage() {
  return (
    <PageContainer
      pageTitle='Attendance'
      pageDescription='Operational class-day attendance marking for Schly.'
    >
      <AttendanceShell />
    </PageContainer>
  );
}
