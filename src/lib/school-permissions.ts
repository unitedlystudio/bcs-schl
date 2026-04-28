export const DASHBOARD_PERMISSION_CATALOG = [
  {
    key: 'org:overview:read',
    label: 'Dashboard overview',
    description: 'See the main school dashboard and summary views.',
    group: 'General'
  },
  {
    key: 'org:students:read',
    label: 'Students',
    description: 'Open the student directory and student records.',
    group: 'School records'
  },
  {
    key: 'org:teachers:read',
    label: 'Teachers',
    description: 'View the teacher directory and ownership details.',
    group: 'School records'
  },
  {
    key: 'org:admissions:read',
    label: 'Admissions',
    description: 'Open admissions and intake workflows.',
    group: 'School records'
  },
  {
    key: 'org:attendance:read',
    label: 'Attendance',
    description: 'Review attendance boards and attendance operations.',
    group: 'Operations'
  },
  {
    key: 'org:concerns:read',
    label: 'Concerns',
    description: 'View concern cases and student support workflows.',
    group: 'Operations'
  },
  {
    key: 'org:finance:read',
    label: 'Finance visibility',
    description: 'Open accounts, activity, and collections views.',
    group: 'Finance'
  },
  {
    key: 'org:finance:write',
    label: 'Finance changes',
    description: 'Record payments, reminders, and finance updates.',
    group: 'Finance'
  },
  {
    key: 'org:operations:read',
    label: 'Operations',
    description: 'Open the daily operations workspace.',
    group: 'Operations'
  },
  {
    key: 'org:staffing:read',
    label: 'Staffing',
    description: 'View staff leave and cover planning.',
    group: 'Operations'
  },
  {
    key: 'org:notifications:read',
    label: 'Inbox',
    description: 'Open inbox and notification workflows.',
    group: 'Communication'
  },
  {
    key: 'org:chat:read',
    label: 'Chat',
    description: 'Open internal chat and message workflows.',
    group: 'Communication'
  },
  {
    key: 'org:access:read',
    label: 'Platform access',
    description: 'Open stored platform logins and account access records.',
    group: 'Admin'
  },
  {
    key: 'org:admin:manage',
    label: 'School organisation admin',
    description: 'Manage staff dashboard permissions and school access settings.',
    group: 'Admin'
  }
] as const;

export type DashboardPermissionKey = (typeof DASHBOARD_PERMISSION_CATALOG)[number]['key'];

export const DASHBOARD_PERMISSION_KEYS = DASHBOARD_PERMISSION_CATALOG.map(
  (permission) => permission.key
) as DashboardPermissionKey[];

export const DASHBOARD_ROLE_PRESETS = {
  Inherited: [] as DashboardPermissionKey[],
  Owner: DASHBOARD_PERMISSION_KEYS,
  Admin: DASHBOARD_PERMISSION_KEYS,
  Accounts: [
    'org:overview:read',
    'org:students:read',
    'org:finance:read',
    'org:finance:write',
    'org:notifications:read'
  ],
  Teacher: [
    'org:overview:read',
    'org:students:read',
    'org:teachers:read',
    'org:attendance:read',
    'org:concerns:read',
    'org:notifications:read',
    'org:chat:read'
  ],
  'Teacher Assistant': [
    'org:overview:read',
    'org:students:read',
    'org:attendance:read',
    'org:notifications:read'
  ],
  Staff: [
    'org:overview:read',
    'org:students:read',
    'org:attendance:read',
    'org:notifications:read'
  ],
  Custom: [] as DashboardPermissionKey[]
} as const;

export type DashboardRole = keyof typeof DASHBOARD_ROLE_PRESETS;

export const DASHBOARD_ROLE_OPTIONS = Object.keys(DASHBOARD_ROLE_PRESETS) as DashboardRole[];

export function isDashboardRole(value: string): value is DashboardRole {
  return DASHBOARD_ROLE_OPTIONS.includes(value as DashboardRole);
}

export const MANAGED_NAV_PERMISSION_KEYS = new Set<DashboardPermissionKey>([
  'org:overview:read',
  'org:students:read',
  'org:teachers:read',
  'org:admissions:read',
  'org:attendance:read',
  'org:concerns:read',
  'org:operations:read',
  'org:staffing:read',
  'org:notifications:read',
  'org:chat:read',
  'org:access:read'
]);

export function isDashboardPermissionKey(value: string): value is DashboardPermissionKey {
  return DASHBOARD_PERMISSION_KEYS.includes(value as DashboardPermissionKey);
}

export function normalizeDashboardPermissions(values: string[]): DashboardPermissionKey[] {
  // oxlint-disable-next-line unicorn/no-array-sort
  return Array.from(new Set(values.filter(isDashboardPermissionKey))).sort((left, right) =>
    left.localeCompare(right)
  ) as DashboardPermissionKey[];
}

export function permissionSetForRole(role: DashboardRole): DashboardPermissionKey[] {
  return [...DASHBOARD_ROLE_PRESETS[role]];
}

export function roleMatchesPermissions(role: DashboardRole, permissions: string[]) {
  if (role === 'Inherited' || role === 'Custom') {
    return false;
  }

  const normalized = normalizeDashboardPermissions(permissions);
  const preset = normalizeDashboardPermissions(permissionSetForRole(role));

  return (
    normalized.length === preset.length &&
    normalized.every((permission, index) => permission === preset[index])
  );
}

export function hasDashboardPermission(
  permissions: Iterable<string>,
  permission: string,
  role?: string
) {
  const values = new Set(permissions);
  const roleLower = role?.toLowerCase() ?? '';
  const hasAdminRole = roleLower.includes('admin') || roleLower.includes('owner');
  const hasAccountsRole = roleLower.includes('account');

  if (values.has('org:admin:manage') || hasAdminRole) {
    return true;
  }

  if (permission === 'org:finance:read') {
    return values.has('org:finance:read') || values.has('org:finance:write') || hasAccountsRole;
  }

  if (permission === 'org:finance:write') {
    return values.has('org:finance:write') || hasAccountsRole;
  }

  return values.has(permission);
}

export function summarizeDashboardPermissions(permissions: string[]) {
  const normalized = normalizeDashboardPermissions(permissions);
  const catalog = new Map(DASHBOARD_PERMISSION_CATALOG.map((entry) => [entry.key, entry]));
  const labels = normalized.map((permission) => catalog.get(permission)?.label).filter(Boolean);

  return {
    count: normalized.length,
    labels
  };
}
