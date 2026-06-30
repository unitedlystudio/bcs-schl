import PageContainer from '@/components/layout/page-container';
import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import { AddStudentSheetTrigger } from '@/features/students/components/add-student-sheet';
import StudentDirectory from '@/features/students/components/student-directory';

export const metadata = {
  title: 'Dashboard: Students'
};

export default function StudentsPage() {
  return (
    <DashboardPermissionGate permission='org:students:read' areaLabel='Students'>
      <PageContainer
        pageTitle='Students'
        pageDescription='Canonical student directory for Schly.'
        pageHeaderAction={<AddStudentSheetTrigger buttonSize='sm' />}
      >
        <StudentDirectory />
      </PageContainer>
    </DashboardPermissionGate>
  );
}
