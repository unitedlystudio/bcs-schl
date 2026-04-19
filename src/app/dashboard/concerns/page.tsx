import PageContainer from '@/components/layout/page-container';
import ConcernsShell from '@/features/concerns/components/concerns-shell';

export const metadata = {
  title: 'Dashboard: Concerns'
};

export default function ConcernsPage() {
  return (
    <PageContainer
      pageTitle='Concerns'
      pageDescription='Student support and intervention workflow with ownership, review dates, and case history.'
    >
      <ConcernsShell />
    </PageContainer>
  );
}
