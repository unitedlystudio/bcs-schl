import PageContainer from '@/components/layout/page-container';
import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import StudentDetailShell from '@/features/students/components/student-detail-shell';

export const metadata = {
  title: 'Dashboard: Student Profile'
};

export default async function StudentProfilePage({
  params
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;

  return (
    <DashboardPermissionGate permission='org:students:read' areaLabel='Student profile'>
      <PageContainer
        pageTitle='Student Profile'
        pageDescription='Operational student record with attendance, admissions, and classroom ownership context.'
      >
        <StudentDetailShell studentId={studentId} />
      </PageContainer>
    </DashboardPermissionGate>
  );
}
