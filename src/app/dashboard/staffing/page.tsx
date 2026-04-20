import PageContainer from '@/components/layout/page-container';
import StaffingShell from '@/features/staffing/components/staffing-shell';

export const metadata = {
  title: 'Dashboard: Staffing'
};

export default function StaffingPage() {
  return (
    <PageContainer
      pageTitle='Staffing'
      pageDescription='Track teacher leave requests, cover assignments, and the day-of staffing board.'
    >
      <StaffingShell />
    </PageContainer>
  );
}
