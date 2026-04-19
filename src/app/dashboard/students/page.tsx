import PageContainer from '@/components/layout/page-container';
import StudentDirectory from '@/features/students/components/student-directory';

export const metadata = {
  title: 'Dashboard: Students'
};

export default function StudentsPage() {
  return (
    <PageContainer pageTitle='Students' pageDescription='Canonical student directory for Schly.'>
      <StudentDirectory />
    </PageContainer>
  );
}
