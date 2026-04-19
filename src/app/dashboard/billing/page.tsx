import PageContainer from '@/components/layout/page-container';
import FinanceShell from '@/features/finance/components/finance-shell';

export const metadata = {
  title: 'Dashboard: Finance & Fees'
};

export default function BillingPage() {
  return (
    <PageContainer
      pageTitle='Finance & Fees'
      pageDescription='Student billing profiles, scholarships, charges, payments, reminders, and arrears.'
    >
      <FinanceShell />
    </PageContainer>
  );
}
