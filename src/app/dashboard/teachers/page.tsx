import PageContainer from '@/components/layout/page-container';
import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import TeacherDirectory from '@/features/teachers/components/teacher-directory';

export const metadata = {
  title: 'Dashboard: Teachers'
};

export default function TeachersPage() {
  return (
    <DashboardPermissionGate permission='org:teachers:read' areaLabel='Teachers'>
      <PageContainer
        pageTitle='Teachers'
        pageDescription='Editable teacher ownership and homeroom assignment management for Schly.'
      >
        <TeacherDirectory />
      </PageContainer>
    </DashboardPermissionGate>
  );
}
