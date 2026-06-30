import PageContainer from '@/components/layout/page-container';
import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import SchoolOrganizationShell from '@/features/school-organization/components/school-organization-shell';
import { teamInfoContent } from '@/config/infoconfig';

export default function TeamPage() {
  return (
    <DashboardPermissionGate permission='org:admin:manage' areaLabel='School organisation'>
      <PageContainer
        pageTitle='School Organisation'
        pageDescription='Manage staff dashboard permissions, access profiles, and workspace settings for this school.'
        infoContent={teamInfoContent}
      >
        <SchoolOrganizationShell />
      </PageContainer>
    </DashboardPermissionGate>
  );
}
