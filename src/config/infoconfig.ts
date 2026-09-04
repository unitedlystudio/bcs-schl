import type { InfobarContent } from '@/components/ui/infobar';

export const workspacesInfoContent: InfobarContent = {
  title: 'Single-school access',
  sections: [
    {
      title: 'Overview',
      description:
        'This deployment serves one school. Staff access is assigned by an administrator; there is no workspace switcher.',
      links: []
    }
  ]
};

export const teamInfoContent: InfobarContent = {
  title: 'School access',
  sections: [
    {
      title: 'Invitation links',
      description:
        'Administrators create expiring, reveal-once links. Schly does not send an email; copy the link and share it through an approved channel.',
      links: []
    },
    {
      title: 'Roles and permissions',
      description:
        'Roles and permissions are application-owned and enforced by Convex on every protected operation.',
      links: []
    }
  ]
};

export const billingInfoContent: InfobarContent = {
  title: 'School finance',
  sections: [
    {
      title: 'Overview',
      description:
        'Billing pages contain school finance workflows. Access is controlled by the finance read and write permissions.',
      links: []
    }
  ]
};
