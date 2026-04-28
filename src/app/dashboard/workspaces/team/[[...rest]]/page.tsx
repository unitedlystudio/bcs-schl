import PageContainer from '@/components/layout/page-container';
import SchoolOrganizationShell from '@/features/school-organization/components/school-organization-shell';
import { teamInfoContent } from '@/config/infoconfig';

export default function TeamPage() {
  return (
    <PageContainer
      pageTitle='School Organisation'
      pageDescription='Manage staff dashboard permissions, access profiles, and workspace settings for this school.'
      infoContent={teamInfoContent}
    >
      <SchoolOrganizationShell />
    </PageContainer>
  );
}
