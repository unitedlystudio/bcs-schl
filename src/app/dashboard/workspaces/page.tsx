'use client';

import PageContainer from '@/components/layout/page-container';
import WorkspaceMembershipList from '@/features/school-organization/components/workspace-membership-list';
import { workspacesInfoContent } from '@/config/infoconfig';

export default function WorkspacesPage() {
  return (
    <PageContainer
      pageTitle='Workspaces'
      pageDescription='Open the school workspaces you were invited to'
      infoContent={workspacesInfoContent}
    >
      <WorkspaceMembershipList />
    </PageContainer>
  );
}
