import PageContainer from '@/components/layout/page-container';
import FinanceStudentDetailShell from '@/features/finance/components/finance-student-detail-shell';

export const metadata = {
  title: 'Dashboard: Student Finance'
};

export default async function BillingStudentPage({
  params
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;

  return (
    <PageContainer
      pageTitle='Student Finance'
      pageDescription='Dedicated per-student finance workspace for billing setup, charges, payments, and follow-up.'
    >
      <FinanceStudentDetailShell studentId={studentId} />
    </PageContainer>
  );
}
