import PageContainer from '@/components/layout/page-container';
import OperationsShell from '@/features/operations/components/operations-shell';

export const metadata = {
  title: 'Dashboard: Timetable & Operations'
};

export default function OperationsPage() {
  return (
    <PageContainer
      pageTitle='Timetable & Operations'
      pageDescription='Weekly class timetable, specialist coverage, lunch flow, and daily operational overrides.'
    >
      <OperationsShell />
    </PageContainer>
  );
}
