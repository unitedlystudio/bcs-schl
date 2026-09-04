import PageContainer from '@/components/layout/page-container';
import { DashboardPermissionGate } from '@/components/layout/dashboard-permission-gate';
import SchoolOrganizationShell from '@/features/school-organization/components/school-organization-shell';
import { teamInfoContent } from '@/config/infoconfig';

export default function SchoolAccessPage() {
  return (
    <DashboardPermissionGate permission='org:admin:manage' areaLabel='School access'>
      <PageContainer
        pageTitle='School access'
        pageDescription='Create invitation links and review account access.'
        infoContent={teamInfoContent}
      >
        <SchoolOrganizationShell />
      </PageContainer>
    </DashboardPermissionGate>
  );
}
