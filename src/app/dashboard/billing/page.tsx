import PageContainer from '@/components/layout/page-container';
import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import FinanceShell from '@/features/finance/components/finance-shell';

export const metadata = {
  title: 'Dashboard: Finance & Fees'
};

export default function BillingPage() {
  return (
    <DashboardPermissionGate permission='org:finance:read' areaLabel='Finance & Fees'>
      <PageContainer
        pageTitle='Finance & Fees'
        pageDescription='Student billing profiles, scholarships, charges, payments, reminders, and arrears.'
      >
        <FinanceShell />
      </PageContainer>
    </DashboardPermissionGate>
  );
}
