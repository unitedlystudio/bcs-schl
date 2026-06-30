import PageContainer from '@/components/layout/page-container';
import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import { AdmissionsFormTrigger } from '@/features/admissions/components/admissions-form-sheet';
import AdmissionsShell from '@/features/admissions/components/admissions-shell';

export const metadata = {
  title: 'Dashboard: Admissions'
};

export default function AdmissionsPage() {
  return (
    <DashboardPermissionGate permission='org:admissions:read' areaLabel='Admissions'>
      <PageContainer
        pageTitle='Admissions'
        pageDescription='Starter pipeline shell for enquiries, tours, and enrolment follow-up.'
        pageHeaderAction={<AdmissionsFormTrigger buttonSize='sm' />}
      >
        <AdmissionsShell />
      </PageContainer>
    </DashboardPermissionGate>
  );
}
