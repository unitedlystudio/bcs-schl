import type { DashboardPermissionKey } from '@/lib/school-permissions';
import type { NavGroup } from '@/types';

export const dashboardNavGroups: NavGroup[] = [
  {
    label: 'Core school',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        access: { requireOrg: true, permission: 'org:overview:read' },
        items: []
      },
      {
        title: 'Students',
        url: '/dashboard/students',
        icon: 'teams',
        isActive: false,
        shortcut: ['s', 's'],
        access: { requireOrg: true, permission: 'org:students:read' },
        items: []
      },
      {
        title: 'Teachers',
        url: '/dashboard/teachers',
        icon: 'userPen',
        isActive: false,
        shortcut: ['t', 'e'],
        access: { requireOrg: true, permission: 'org:teachers:read' },
        items: []
      },
      {
        title: 'Admissions',
        url: '/dashboard/admissions',
        icon: 'forms',
        isActive: false,
        shortcut: ['m', 'a'],
        access: { requireOrg: true, permission: 'org:admissions:read' },
        items: []
      }
    ]
  },
  {
    label: 'Student support & daily ops',
    items: [
      {
        title: 'Attendance',
        url: '/dashboard/attendance',
        icon: 'calendar',
        isActive: false,
        shortcut: ['t', 't'],
        access: { requireOrg: true, permission: 'org:attendance:read' },
        items: []
      },
      {
        title: 'Concerns',
        url: '/dashboard/concerns',
        icon: 'warning',
        isActive: false,
        shortcut: ['c', 'o'],
        access: { requireOrg: true, permission: 'org:concerns:read' },
        items: []
      },
      {
        title: 'Operations',
        url: '/dashboard/operations',
        icon: 'calendar',
        isActive: false,
        shortcut: ['o', 'p'],
        access: { requireOrg: true, permission: 'org:operations:read' },
        items: []
      },
      {
        title: 'Staffing',
        url: '/dashboard/staffing',
        icon: 'userPen',
        isActive: false,
        shortcut: ['s', 't'],
        access: { requireOrg: true, permission: 'org:staffing:read' },
        items: []
      }
    ]
  },
  {
    label: 'Accounts & finance',
    items: [
      {
        title: 'Finance',
        url: '/dashboard/billing',
        icon: 'billing',
        isActive: false,
        shortcut: ['f', 'i'],
        access: { requireOrg: true, permission: 'org:finance:read' },
        items: []
      }
    ]
  },
  {
    label: 'Communication',
    items: [
      {
        title: 'Inbox',
        url: '/dashboard/notifications',
        icon: 'notification',
        isActive: false,
        shortcut: ['i', 'i'],
        access: { requireOrg: true, permission: 'org:notifications:read' },
        items: []
      },
      {
        title: 'Chat',
        url: '/dashboard/chat',
        icon: 'chat',
        isActive: false,
        shortcut: ['c', 'c'],
        access: { requireOrg: true, permission: 'org:chat:read' },
        items: []
      }
    ]
  },
  {
    label: 'Administration',
    items: [
      {
        title: 'Platform Access',
        url: '/dashboard/access',
        icon: 'lock',
        isActive: false,
        shortcut: ['a', 'a'],
        access: { requireOrg: true, permission: 'org:access:read' },
        items: []
      },
      {
        title: 'School Organisation',
        url: '/dashboard/workspaces/team',
        icon: 'settings',
        isActive: false,
        shortcut: ['o', 'g'],
        access: { requireOrg: true, permission: 'org:admin:manage' },
        items: []
      }
    ]
  },
  {
    label: 'Account',
    items: [
      {
        title: 'Profile',
        url: '/dashboard/profile',
        icon: 'profile',
        isActive: false,
        shortcut: ['m', 'm'],
        items: []
      }
    ]
  }
];

export type StudentDetailTabConfig = {
  value: 'profile' | 'attendance' | 'concerns' | 'admissions' | 'finance';
  label: string;
  permission?: DashboardPermissionKey;
};

export const studentDetailTabs: StudentDetailTabConfig[] = [
  {
    value: 'profile',
    label: 'Profile'
  },
  {
    value: 'attendance',
    label: 'Attendance',
    permission: 'org:attendance:read'
  },
  {
    value: 'concerns',
    label: 'Concerns',
    permission: 'org:concerns:read'
  },
  {
    value: 'admissions',
    label: 'Admissions',
    permission: 'org:admissions:read'
  },
  {
    value: 'finance',
    label: 'Finance',
    permission: 'org:finance:read'
  }
] as const;

export type StudentDetailTabValue = StudentDetailTabConfig['value'];
