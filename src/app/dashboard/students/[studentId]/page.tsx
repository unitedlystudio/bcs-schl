import PageContainer from '@/components/layout/page-container';
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
    <PageContainer
      pageTitle='Student Profile'
      pageDescription='Starter shell for the deeper Schly student record.'
    >
      <StudentDetailShell studentId={studentId} />
    </PageContainer>
  );
}
