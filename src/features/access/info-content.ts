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
        'The workbook is grouped into categories like Business Suite, Subscriptions, and Social Media. In the dashboard, those become filterable records instead of loose rows in a spreadsheet, which makes it much easier to search, sort, and later connect to Convex.',
      links: []
    },
    {
      title: 'Security recommendation',
      description:
        'This first pass keeps the spreadsheet structure visible, but long term the actual password values should live in encrypted storage with role-based reveal access. The list view is best used as an inventory and admin surface, not as the final secret-management system.',
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
