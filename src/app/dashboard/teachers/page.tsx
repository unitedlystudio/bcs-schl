import PageContainer from '@/components/layout/page-container';
import TeacherDirectory from '@/features/teachers/components/teacher-directory';

export const metadata = {
  title: 'Dashboard: Teachers'
};

export default function TeachersPage() {
  return (
    <PageContainer
      pageTitle='Teachers'
      pageDescription='Editable teacher ownership and homeroom assignment management for Schly.'
    >
      <TeacherDirectory />
    </PageContainer>
  );
}
