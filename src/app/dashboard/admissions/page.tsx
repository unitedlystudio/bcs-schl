import PageContainer from '@/components/layout/page-container';
import AdmissionsShell from '@/features/admissions/components/admissions-shell';

export const metadata = {
  title: 'Dashboard: Admissions'
};

export default function AdmissionsPage() {
  return (
    <PageContainer
      pageTitle='Admissions'
      pageDescription='Starter pipeline shell for enquiries, tours, and enrolment follow-up.'
    >
      <AdmissionsShell />
    </PageContainer>
  );
}
