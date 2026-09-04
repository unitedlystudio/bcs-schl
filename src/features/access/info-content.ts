import type { InfobarContent } from '@/components/ui/infobar';

export const accessInfoContent: InfobarContent = {
  title: 'Platform Access Inventory',
  sections: [
    {
      title: 'What this page is for',
      description:
        'This page turns the legacy company details spreadsheet into a cleaner access inventory for Schly. It keeps login platforms, account owners, URLs, usernames, recovery numbers, and admin access in one searchable dashboard table.',
      links: []
    },
    {
      title: 'How the spreadsheet was normalized',
      description:
        'The workbook is grouped into categories like Business Suite, Subscriptions, and Social Media. In the dashboard, those become filterable records instead of loose rows in a spreadsheet, making it much easier to search, sort, and work from a real Convex-backed dataset.',
      links: []
    },
    {
      title: 'Security recommendation',
      description:
        'Schly stores only non-secret inventory metadata plus an opaque external secret-manager reference. Passwords are never stored or revealed by this application; operators retrieve credentials directly through the separately audited secret manager.',
      links: []
    },
    {
      title: 'Where this can evolve next',
      description:
        'Once Schly grows, this page can move under an Operations or Admin submenu and split into separate modules for platform access, school directory, vendor logins, and permissioned credential details.',
      links: []
    }
  ]
};
