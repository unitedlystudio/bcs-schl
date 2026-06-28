'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOrganization, OrganizationProfile } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import {
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDashboardAccess } from '@/hooks/use-dashboard-access';
import {
  DASHBOARD_PERMISSION_CATALOG,
  DASHBOARD_ROLE_OPTIONS,
  MANAGED_NAV_PERMISSION_KEYS,
  type DashboardPermissionKey,
  type DashboardRole,
  isDashboardRole,
  normalizeDashboardPermissions,
  permissionSetForRole,
  roleMatchesPermissions
} from '@/lib/school-permissions';
import type { Option } from '@/types/data-table';
import type { Column, ColumnDef, FilterFn } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';

type AccessProfileRecord = {
  id: string;
  userId: string;
  dashboardRole: string;
  roleTemplateId: Id<'schoolDashboardRoles'> | null;
  permissions: DashboardPermissionKey[];
  permissionCount: number;
  updatedAt: number;
  updatedByUserId: string;
};

type RoleTemplateRecord = {
  id: Id<'schoolDashboardRoles'>;
  name: string;
  slug: string;
  permissions: DashboardPermissionKey[];
  permissionCount: number;
  assignmentCount: number;
  updatedAt: number;
  updatedByUserId: string;
};

type StaffAccessRow = {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  imageUrl: string;
  clerkRole: string;
  clerkRoleLabel: string;
  dashboardRole: string;
  roleTemplateId: Id<'schoolDashboardRoles'> | null;
  permissions: DashboardPermissionKey[];
  managed: boolean;
  financeAccess: 'Write' | 'Read' | 'None';
  updatedAt: number | null;
};

type AssignmentRoleOption = {
  value: string;
  label: string;
  permissions: DashboardPermissionKey[];
  roleTemplateId: Id<'schoolDashboardRoles'> | null;
  kind: 'inherited' | 'preset' | 'template' | 'custom';
};

const ROLE_TEMPLATE_VALUE_PREFIX = 'template:';

function toTemplateRoleValue(roleTemplateId: Id<'schoolDashboardRoles'>) {
  return `${ROLE_TEMPLATE_VALUE_PREFIX}${roleTemplateId}`;
}

function readTemplateRoleId(value: string) {
  return value.startsWith(ROLE_TEMPLATE_VALUE_PREFIX)
    ? (value.slice(ROLE_TEMPLATE_VALUE_PREFIX.length) as Id<'schoolDashboardRoles'>)
    : null;
}

function compareLabels(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function buildOptions(entries: Array<{ label: string; value: string; count: number }>): Option[] {
  const filteredEntries = entries.filter((entry) => entry.count > 0);
  // oxlint-disable-next-line unicorn/no-array-sort
  const sortedEntries = filteredEntries.sort((left, right) =>
    compareLabels(left.label, right.label)
  );

  return sortedEntries.map((entry) => ({
    label: entry.label,
    value: entry.value,
    count: entry.count
  }));
}

const matchesSelectedValues: FilterFn<StaffAccessRow> = (row, columnId, filterValue) => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }

  return filterValue.includes(row.getValue(columnId));
};

function getFinanceAccess(permissions: DashboardPermissionKey[]) {
  if (permissions.includes('org:finance:write') || permissions.includes('org:admin:manage')) {
    return 'Write' as const;
  }

  if (permissions.includes('org:finance:read')) {
    return 'Read' as const;
  }

  return 'None' as const;
}

function getInitials(label: string) {
  return label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatTimestamp(timestamp: number | null) {
  if (!timestamp) {
    return 'Not assigned';
  }

  return format(timestamp, 'dd MMM yyyy');
}

function getPermissionLabel(permission: DashboardPermissionKey) {
  return (
    DASHBOARD_PERMISSION_CATALOG.find((entry) => entry.key === permission)?.label ?? permission
  );
}

function getPermissionSummary(permissions: DashboardPermissionKey[]) {
  const managedLabels = permissions
    .filter((permission) => MANAGED_NAV_PERMISSION_KEYS.has(permission))
    .map(getPermissionLabel);

  if (managedLabels.length === 0) {
    return 'No dashboard modules assigned yet.';
  }

  if (managedLabels.length <= 2) {
    return managedLabels.join(' • ');
  }

  return `${managedLabels.slice(0, 2).join(' • ')} +${managedLabels.length - 2} more`;
}

function buildAssignmentRoleOptions(roleTemplates: RoleTemplateRecord[]): AssignmentRoleOption[] {
  const presetRoles = DASHBOARD_ROLE_OPTIONS.filter(
    (role): role is Exclude<DashboardRole, 'Inherited' | 'Custom'> =>
      role !== 'Inherited' && role !== 'Custom'
  ).map((role) => ({
    value: role,
    label: role,
    permissions: normalizeDashboardPermissions(permissionSetForRole(role)),
    roleTemplateId: null,
    kind: 'preset' as const
  }));

  const customRoles = roleTemplates.map((roleTemplate) => ({
    value: toTemplateRoleValue(roleTemplate.id),
    label: roleTemplate.name,
    permissions: normalizeDashboardPermissions(roleTemplate.permissions),
    roleTemplateId: roleTemplate.id,
    kind: 'template' as const
  }));

  return [
    {
      value: 'Inherited',
      label: 'Inherited',
      permissions: [],
      roleTemplateId: null,
      kind: 'inherited'
    },
    ...presetRoles,
    ...customRoles,
    {
      value: 'Custom',
      label: 'Custom permissions',
      permissions: [],
      roleTemplateId: null,
      kind: 'custom'
    }
  ];
}

function getRoleValueForRow(row: StaffAccessRow, roleTemplates: RoleTemplateRecord[]) {
  if (!row.managed) {
    return 'Inherited';
  }

  if (
    row.roleTemplateId &&
    roleTemplates.some((roleTemplate) => roleTemplate.id === row.roleTemplateId)
  ) {
    return toTemplateRoleValue(row.roleTemplateId);
  }

  if (isDashboardRole(row.dashboardRole)) {
    return row.dashboardRole;
  }

  return 'Custom';
}

function getStaffAccessColumns({
  roleOptions,
  dashboardRoleOptions,
  financeOptions,
  onOpenEditor
}: {
  roleOptions: Option[];
  dashboardRoleOptions: Option[];
  financeOptions: Option[];
  onOpenEditor: (row: StaffAccessRow) => void;
}): ColumnDef<StaffAccessRow>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() ? 'indeterminate' : false)
          }
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
          aria-label='Select all staff members on page'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
          aria-label={`Select ${row.original.fullName}`}
          onClick={(event) => event.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
      size: 40
    },
    {
      id: 'employee',
      accessorFn: (row) => [row.fullName, row.email].filter(Boolean).join(' '),
      header: ({ column }: { column: Column<StaffAccessRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Employee' />
      ),
      cell: ({ row }) => (
        <div className='flex min-w-[240px] items-center gap-3'>
          <Avatar className='h-9 w-9'>
            <AvatarImage src={row.original.imageUrl} alt={row.original.fullName} />
            <AvatarFallback>{getInitials(row.original.fullName)}</AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <span className='font-medium'>{row.original.fullName}</span>
            <span className='text-muted-foreground text-xs'>
              {row.original.email || 'No email shared'}
            </span>
          </div>
        </div>
      ),
      meta: {
        label: 'Employee',
        placeholder: 'Search staff by name or email...',
        variant: 'text' as const
      },
      enableColumnFilter: true
    },
    {
      id: 'clerkRoleLabel',
      accessorKey: 'clerkRoleLabel',
      header: ({ column }: { column: Column<StaffAccessRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Organisation role' />
      ),
      cell: ({ cell }) => <Badge variant='outline'>{cell.getValue<string>()}</Badge>,
      meta: {
        label: 'Organisation role',
        variant: 'multiSelect' as const,
        options: roleOptions
      },
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: matchesSelectedValues
    },
    {
      id: 'dashboardRole',
      accessorKey: 'dashboardRole',
      header: ({ column }: { column: Column<StaffAccessRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Dashboard role' />
      ),
      cell: ({ row }) => (
        <div className='flex flex-col gap-1'>
          <Badge variant={row.original.managed ? 'secondary' : 'outline'}>
            {row.original.dashboardRole}
          </Badge>
          <span className='text-muted-foreground text-xs'>
            {row.original.managed ? 'Managed in Schly' : 'Inherited access'}
          </span>
        </div>
      ),
      meta: {
        label: 'Dashboard role',
        variant: 'multiSelect' as const,
        options: dashboardRoleOptions
      },
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: matchesSelectedValues
    },
    {
      id: 'financeAccess',
      accessorKey: 'financeAccess',
      header: ({ column }: { column: Column<StaffAccessRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Finance' />
      ),
      cell: ({ row }) => {
        const variant =
          row.original.financeAccess === 'Write'
            ? 'default'
            : row.original.financeAccess === 'Read'
              ? 'secondary'
              : 'outline';
        return <Badge variant={variant}>{row.original.financeAccess}</Badge>;
      },
      meta: {
        label: 'Finance',
        variant: 'multiSelect' as const,
        options: financeOptions
      },
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: matchesSelectedValues
    },
    {
      id: 'permissionSummary',
      accessorFn: (row) => getPermissionSummary(row.permissions),
      header: 'Dashboard access',
      cell: ({ row }) => (
        <div className='min-w-[260px]'>
          <div className='text-sm'>{getPermissionSummary(row.original.permissions)}</div>
          <div className='text-muted-foreground mt-1 text-xs'>
            {row.original.permissions.length} permissions saved
          </div>
        </div>
      ),
      enableSorting: false
    },
    {
      id: 'updatedAt',
      accessorFn: (row) => row.updatedAt ?? 0,
      header: ({ column }: { column: Column<StaffAccessRow, unknown> }) => (
        <DataTableColumnHeader column={column} title='Updated' />
      ),
      cell: ({ row }) => (
        <div className='flex flex-col gap-1'>
          <span>{formatTimestamp(row.original.updatedAt)}</span>
          <Button
            type='button'
            variant='link'
            className='h-auto justify-start p-0 text-xs'
            onClick={(event) => {
              event.stopPropagation();
              onOpenEditor(row.original);
            }}
          >
            Edit access
          </Button>
        </div>
      )
    }
  ];
}

function RoleTemplateEditorSheet({
  open,
  onOpenChange,
  orgId,
  roleTemplate
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  roleTemplate: RoleTemplateRecord | null;
}) {
  const saveRoleTemplate = useMutation(api.schoolOrganization.saveRoleTemplate);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<DashboardPermissionKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(roleTemplate?.name ?? '');
    setPermissions(normalizeDashboardPermissions(roleTemplate?.permissions ?? []));
  }, [open, roleTemplate]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Array<(typeof DASHBOARD_PERMISSION_CATALOG)[number]>>();

    for (const permission of DASHBOARD_PERMISSION_CATALOG) {
      const current = groups.get(permission.group) ?? [];
      current.push(permission);
      groups.set(permission.group, current);
    }

    return Array.from(groups.entries());
  }, []);

  async function handleSave() {
    setIsSaving(true);

    try {
      await saveRoleTemplate({
        orgId,
        ...(roleTemplate ? { roleId: roleTemplate.id } : {}),
        name,
        permissions: normalizeDashboardPermissions(permissions)
      });
      toast.success(roleTemplate ? 'Role updated.' : 'Role created.');
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save role.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  function togglePermission(permission: DashboardPermissionKey, checked: boolean) {
    setPermissions((current) =>
      normalizeDashboardPermissions(
        checked ? [...current, permission] : current.filter((value) => value !== permission)
      )
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col sm:max-w-2xl'>
        <SheetHeader>
          <SheetTitle>
            {roleTemplate ? `Edit ${roleTemplate.name}` : 'Create organisation role'}
          </SheetTitle>
          <SheetDescription>
            Save a reusable role like Accounts Staff or Teacher Assistant, then assign it to staff
            from the permissions grid.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 space-y-6 overflow-auto pr-1'>
          <div className='space-y-2'>
            <div className='text-sm font-medium'>Role name</div>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder='e.g. Accounts Staff'
            />
            <p className='text-muted-foreground text-xs'>
              Pick a clear label that owners will recognize when assigning access.
            </p>
          </div>

          <div className='rounded-2xl border border-border/60'>
            <div className='flex items-center justify-between gap-3 border-b px-4 py-3'>
              <div>
                <div className='text-sm font-medium'>Permission checklist</div>
                <div className='text-muted-foreground text-xs'>
                  {permissions.length} permissions selected
                </div>
              </div>
              <Button type='button' variant='ghost' size='sm' onClick={() => setPermissions([])}>
                Clear
              </Button>
            </div>
            <div className='space-y-4 p-4'>
              {groupedPermissions.map(([groupLabel, groupPermissions], groupIndex) => (
                <div key={groupLabel} className='space-y-3'>
                  {groupIndex > 0 ? <Separator /> : null}
                  <div>
                    <div className='text-sm font-medium'>{groupLabel}</div>
                    <div className='text-muted-foreground text-xs'>
                      Choose what this organisation role can open and manage across Schly.
                    </div>
                  </div>
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {groupPermissions.map((permission) => {
                      const checkboxId = `role-template-${permission.key}`;

                      return (
                        <div
                          key={permission.key}
                          className='flex items-start gap-3 rounded-xl border border-border/60 p-3'
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={permissions.includes(permission.key)}
                            onCheckedChange={(checked) =>
                              togglePermission(permission.key, Boolean(checked))
                            }
                          />
                          <label htmlFor={checkboxId} className='space-y-1'>
                            <div className='text-sm font-medium'>{permission.label}</div>
                            <div className='text-muted-foreground text-xs'>
                              {permission.description}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='button' onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Saving…' : roleTemplate ? 'Save role' : 'Create role'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function AccessEditorSheet({
  open,
  onOpenChange,
  rows,
  orgId,
  roleTemplates
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: StaffAccessRow[];
  orgId: string;
  roleTemplates: RoleTemplateRecord[];
}) {
  const saveAccessProfile = useMutation(api.schoolOrganization.saveAccessProfile);
  const bulkSaveAccessProfiles = useMutation(api.schoolOrganization.bulkSaveAccessProfiles);
  const clearAccessProfiles = useMutation(api.schoolOrganization.clearAccessProfiles);
  const [selectedRoleValue, setSelectedRoleValue] = useState<string>('Inherited');
  const [permissions, setPermissions] = useState<DashboardPermissionKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isBulk = rows.length > 1;
  const isPending = isSaving;
  const roleOptions = useMemo(() => buildAssignmentRoleOptions(roleTemplates), [roleTemplates]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (rows.length === 1) {
      const row = rows[0];
      setSelectedRoleValue(getRoleValueForRow(row, roleTemplates));
      setPermissions(normalizeDashboardPermissions(row.managed ? row.permissions : []));
      return;
    }

    const firstRole = rows[0] ? getRoleValueForRow(rows[0], roleTemplates) : 'Inherited';
    const allSameRole = rows.every((row) => getRoleValueForRow(row, roleTemplates) === firstRole);
    const firstPermissions = normalizeDashboardPermissions(
      rows[0]?.managed ? rows[0].permissions : []
    );
    const allSamePermissions = rows.every((row) => {
      const next = normalizeDashboardPermissions(row.managed ? row.permissions : []);
      return (
        firstPermissions.length === next.length &&
        firstPermissions.every((permission, index) => permission === next[index])
      );
    });

    setSelectedRoleValue(allSameRole ? firstRole : 'Custom');
    setPermissions(allSamePermissions ? firstPermissions : []);
  }, [open, roleTemplates, rows]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Array<(typeof DASHBOARD_PERMISSION_CATALOG)[number]>>();

    for (const permission of DASHBOARD_PERMISSION_CATALOG) {
      const current = groups.get(permission.group) ?? [];
      current.push(permission);
      groups.set(permission.group, current);
    }

    return Array.from(groups.entries());
  }, []);

  const selectedRoleOption =
    roleOptions.find((roleOption) => roleOption.value === selectedRoleValue) ?? roleOptions[0];

  async function handleSave() {
    setIsSaving(true);

    try {
      const userIds = rows.map((row) => row.userId);
      const normalizedPermissions = normalizeDashboardPermissions(permissions);
      const roleTemplateId = readTemplateRoleId(selectedRoleValue);
      const roleTemplate = roleTemplateId
        ? (roleTemplates.find((entry) => entry.id === roleTemplateId) ?? null)
        : null;
      const dashboardRoleLabel =
        roleTemplate?.name ?? (selectedRoleValue === 'Custom' ? 'Custom' : selectedRoleValue);

      if (selectedRoleValue === 'Inherited') {
        await clearAccessProfiles({ orgId, userIds });
        toast.success(
          isBulk
            ? 'Selected staff members now inherit their dashboard access.'
            : 'Dashboard access reset to inherited.'
        );
        onOpenChange(false);
        return;
      }

      if (isBulk) {
        await bulkSaveAccessProfiles({
          orgId,
          userIds,
          dashboardRoleLabel,
          ...(roleTemplateId ? { roleTemplateId } : {}),
          permissions: normalizedPermissions
        });
      } else {
        await saveAccessProfile({
          orgId,
          userId: userIds[0],
          dashboardRoleLabel,
          ...(roleTemplateId ? { roleTemplateId } : {}),
          permissions: normalizedPermissions
        });
      }

      toast.success(isBulk ? 'Bulk dashboard access updated.' : 'Dashboard access updated.');
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save dashboard access.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleRoleChange(nextRoleValue: string) {
    const nextRole = roleOptions.find((roleOption) => roleOption.value === nextRoleValue);
    setSelectedRoleValue(nextRoleValue);

    if (!nextRole) {
      return;
    }

    if (nextRole.kind === 'custom') {
      return;
    }

    setPermissions(normalizeDashboardPermissions(nextRole.permissions));
  }

  function togglePermission(permission: DashboardPermissionKey, checked: boolean) {
    const nextPermissions = normalizeDashboardPermissions(
      checked ? [...permissions, permission] : permissions.filter((value) => value !== permission)
    );

    setPermissions(nextPermissions);

    if (selectedRoleValue === 'Inherited') {
      setSelectedRoleValue('Custom');
      return;
    }

    if (
      selectedRoleOption.kind === 'preset' &&
      isDashboardRole(selectedRoleOption.label) &&
      !roleMatchesPermissions(selectedRoleOption.label, nextPermissions)
    ) {
      setSelectedRoleValue('Custom');
      return;
    }

    if (
      selectedRoleOption.kind === 'template' &&
      (selectedRoleOption.permissions.length !== nextPermissions.length ||
        selectedRoleOption.permissions.some(
          (permissionKey, index) => permissionKey !== nextPermissions[index]
        ))
    ) {
      setSelectedRoleValue('Custom');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col sm:max-w-2xl'>
        <SheetHeader>
          <SheetTitle>
            {isBulk ? 'Bulk dashboard permissions' : 'Edit dashboard permissions'}
          </SheetTitle>
          <SheetDescription>
            {isBulk
              ? `Apply one organisation role or permission set to ${rows.length} selected staff members.`
              : 'Choose a built-in role, a saved organisation role, or a custom permission mix for this staff member.'}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 space-y-6 overflow-auto pr-1'>
          <div className='rounded-2xl border border-border/60 bg-muted/20 p-4'>
            <div className='text-sm font-medium'>
              {isBulk ? 'Selected staff members' : (rows[0]?.fullName ?? 'Staff member')}
            </div>
            <div className='text-muted-foreground mt-1 text-sm'>
              {isBulk
                ? rows.map((row) => row.fullName).join(', ')
                : rows[0]?.email || rows[0]?.clerkRoleLabel || 'Dashboard access assignment'}
            </div>
          </div>

          <div className='grid gap-3'>
            <div className='space-y-2'>
              <div className='text-sm font-medium'>Organisation role</div>
              <Select value={selectedRoleValue} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder='Choose a role' />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((roleOption) => (
                    <SelectItem key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-muted-foreground text-xs'>
                Saved organisation roles can be reused for accounts staff, teachers, assistants, and
                any other school-specific access pattern.
              </p>
            </div>

            <div className='rounded-2xl border border-border/60'>
              <div className='flex items-center justify-between gap-3 border-b px-4 py-3'>
                <div>
                  <div className='text-sm font-medium'>Permission checklist</div>
                  <div className='text-muted-foreground text-xs'>
                    {permissions.length} permissions selected
                  </div>
                </div>
                {selectedRoleValue !== 'Inherited' ? (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      setPermissions([]);
                      setSelectedRoleValue('Custom');
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
              <div className='space-y-4 p-4'>
                {groupedPermissions.map(([groupLabel, groupPermissions], groupIndex) => (
                  <div key={groupLabel} className='space-y-3'>
                    {groupIndex > 0 ? <Separator /> : null}
                    <div>
                      <div className='text-sm font-medium'>{groupLabel}</div>
                      <div className='text-muted-foreground text-xs'>
                        Choose what should appear and be manageable in Schly.
                      </div>
                    </div>
                    <div className='grid gap-3 sm:grid-cols-2'>
                      {groupPermissions.map((permission) => {
                        const checkboxId = `permission-${permission.key}`;

                        return (
                          <div
                            key={permission.key}
                            className='flex items-start gap-3 rounded-xl border border-border/60 p-3'
                          >
                            <Checkbox
                              id={checkboxId}
                              checked={permissions.includes(permission.key)}
                              onCheckedChange={(checked) =>
                                togglePermission(permission.key, Boolean(checked))
                              }
                            />
                            <label htmlFor={checkboxId} className='space-y-1'>
                              <div className='text-sm font-medium'>{permission.label}</div>
                              <div className='text-muted-foreground text-xs'>
                                {permission.description}
                              </div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='button' onClick={() => void handleSave()} disabled={isPending}>
            {isPending ? 'Saving…' : isBulk ? 'Apply access' : 'Save access'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function SchoolOrganizationShell() {
  const dashboardAccess = useDashboardAccess();
  const { organization, memberships, isLoaded } = useOrganization({
    memberships: {
      infinite: true,
      keepPreviousData: true,
      pageSize: 100
    }
  });
  const orgId = organization?.id;
  const accessProfiles = useQuery(
    api.schoolOrganization.listAccessProfiles,
    orgId && dashboardAccess.hasPermission('org:admin:manage') ? { orgId } : 'skip'
  ) as AccessProfileRecord[] | undefined;
  const roleTemplates = useQuery(
    api.schoolOrganization.listRoleTemplates,
    orgId && dashboardAccess.hasPermission('org:admin:manage') ? { orgId } : 'skip'
  ) as RoleTemplateRecord[] | undefined;
  const [sorting, setSorting] = useState<SortingState>([{ id: 'employee', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRows, setEditingRows] = useState<StaffAccessRow[]>([]);
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [editingRoleTemplate, setEditingRoleTemplate] = useState<RoleTemplateRecord | null>(null);
  const clearAccessProfiles = useMutation(api.schoolOrganization.clearAccessProfiles);

  const profileMap = useMemo(
    () => new Map((accessProfiles ?? []).map((profile) => [profile.userId, profile])),
    [accessProfiles]
  );
  const availableRoleTemplates = roleTemplates ?? [];

  const rows = useMemo<StaffAccessRow[]>(() => {
    const members = memberships?.data ?? [];

    return members
      .map((membership) => {
        const profile = profileMap.get(membership.publicUserData?.userId ?? '');
        const fullName =
          [membership.publicUserData?.firstName, membership.publicUserData?.lastName]
            .filter(Boolean)
            .join(' ') ||
          membership.publicUserData?.identifier ||
          'Unnamed staff member';
        const storedPermissions = normalizeDashboardPermissions(profile?.permissions ?? []);
        const inheritedPermissions = normalizeDashboardPermissions(
          (membership.permissions ?? []) as string[]
        );
        const effectivePermissions = profile ? storedPermissions : inheritedPermissions;
        const dashboardRole = profile?.dashboardRole?.trim() || 'Inherited';

        return {
          membershipId: membership.id,
          userId: membership.publicUserData?.userId ?? '',
          fullName,
          email: membership.publicUserData?.identifier ?? '',
          imageUrl: membership.publicUserData?.imageUrl ?? '',
          clerkRole: membership.role,
          clerkRoleLabel: membership.roleName || membership.role,
          dashboardRole,
          roleTemplateId: profile?.roleTemplateId ?? null,
          permissions: effectivePermissions,
          managed: Boolean(profile),
          financeAccess: getFinanceAccess(effectivePermissions),
          updatedAt: profile?.updatedAt ?? null
        };
      })
      .filter((row) => Boolean(row.userId));
  }, [memberships?.data, profileMap]);

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    setRowSelection({});
  }, [rows]);

  const roleOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.clerkRoleLabel, (counts.get(row.clerkRoleLabel) ?? 0) + 1);
    }

    return buildOptions(
      Array.from(counts.entries()).map(([value, count]) => ({ label: value, value, count }))
    );
  }, [rows]);

  const dashboardRoleOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.dashboardRole, (counts.get(row.dashboardRole) ?? 0) + 1);
    }

    return buildOptions(
      Array.from(counts.entries()).map(([value, count]) => ({ label: value, value, count }))
    );
  }, [rows]);

  const financeOptions = useMemo(
    () =>
      buildOptions([
        {
          label: 'Write',
          value: 'Write',
          count: rows.filter((row) => row.financeAccess === 'Write').length
        },
        {
          label: 'Read',
          value: 'Read',
          count: rows.filter((row) => row.financeAccess === 'Read').length
        },
        {
          label: 'None',
          value: 'None',
          count: rows.filter((row) => row.financeAccess === 'None').length
        }
      ]),
    [rows]
  );

  const columns = useMemo(
    () =>
      getStaffAccessColumns({
        roleOptions,
        dashboardRoleOptions,
        financeOptions,
        onOpenEditor: (row) => {
          setEditingRows([row]);
          setSheetOpen(true);
        }
      }),
    [dashboardRoleOptions, financeOptions, roleOptions]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters, pagination, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: (updaterOrValue) => {
      setColumnFilters((previous) => {
        const next =
          typeof updaterOrValue === 'function' ? updaterOrValue(previous) : updaterOrValue;
        setPagination((current) => ({ ...current, pageIndex: 0 }));
        return next;
      });
    },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.userId,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues()
  });

  const filteredRows = table.getFilteredRowModel().rows;
  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
  const hasFilters = columnFilters.length > 0;
  const managedCount = rows.filter((row) => row.managed).length;
  const financeWriters = rows.filter((row) => row.financeAccess === 'Write').length;
  const adminManagers = rows.filter((row) => row.permissions.includes('org:admin:manage')).length;

  async function handleClearSelected() {
    if (!orgId || selectedRows.length === 0) {
      return;
    }

    try {
      await clearAccessProfiles({
        orgId,
        userIds: selectedRows.map((row) => row.userId)
      });
      table.resetRowSelection();
      toast.success('Selected staff members now inherit dashboard access.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to reset selected staff access.';
      toast.error(message);
    }
  }

  const actionBar = (
    <div className='flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-3 sm:flex-row sm:items-center sm:justify-between'>
      <div className='text-sm text-muted-foreground'>
        {selectedRows.length} staff member{selectedRows.length === 1 ? '' : 's'} selected.
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          size='sm'
          onClick={() => {
            setEditingRows(selectedRows);
            setSheetOpen(true);
          }}
        >
          Bulk edit permissions
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => void handleClearSelected()}
        >
          Reset to inherited
        </Button>
      </div>
    </div>
  );

  if (!isLoaded) {
    return (
      <div className='rounded-2xl border border-border/50 bg-background/70 p-6 text-sm text-muted-foreground'>
        Loading school organisation...
      </div>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No school workspace selected</CardTitle>
          <CardDescription>
            Join or create a school workspace first so Schly knows which staff directory to manage.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!dashboardAccess.hasPermission('org:admin:manage')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>School organisation access required</CardTitle>
          <CardDescription>
            Only school owners and admins can manage staff dashboard permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          Ask a workspace owner or admin to grant school organisation access before editing staff
          permissions.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Tabs defaultValue='permissions' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='permissions'>Staff permissions</TabsTrigger>
          <TabsTrigger value='roles'>Organisation roles</TabsTrigger>
          <TabsTrigger value='workspace'>Workspace settings</TabsTrigger>
        </TabsList>

        <TabsContent value='permissions' className='space-y-4'>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>School staff dashboard access</CardTitle>
                <CardDescription>
                  Use a calmer staff grid to decide who can see each dashboard lane, then drill into
                  edit or bulk changes when the school team shifts.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className='grid gap-3'>
              <div className='flex flex-wrap gap-2 text-sm text-muted-foreground'>
                <Badge variant='secondary'>{rows.length} staff members</Badge>
                <Badge variant='outline'>{managedCount} managed in Schly</Badge>
                <Badge variant='outline'>{financeWriters} finance operators</Badge>
                <Badge variant='outline'>{adminManagers} permission admins</Badge>
                <Badge variant='outline'>
                  {availableRoleTemplates.length} saved organisation roles
                </Badge>
              </div>
              <div className='text-sm text-muted-foreground'>
                Click a row to edit one staff member, or select multiple rows to apply a bulk
                permission set.
              </div>
            </CardContent>
          </Card>

          {rows.length === 0 ? (
            <Card>
              <CardContent className='p-6 text-sm text-muted-foreground'>
                No organisation members were found for this school workspace yet.
              </CardContent>
            </Card>
          ) : (
            <Card className='flex flex-1 flex-col'>
              <CardContent className='flex flex-1 flex-col p-4'>
                <DataTable
                  table={table}
                  actionBar={selectedRows.length > 0 ? actionBar : undefined}
                  onRowClick={(row) => {
                    setEditingRows([row.original]);
                    setSheetOpen(true);
                  }}
                >
                  <DataTableToolbar table={table}>
                    <div className='hidden text-xs text-muted-foreground xl:block'>
                      {hasFilters
                        ? 'Filters applied. Reset them to see the full school staff grid again.'
                        : 'Unmanaged staff keep today’s broader dashboard visibility until you assign a Schly permission profile or organisation role.'}
                    </div>
                  </DataTableToolbar>
                </DataTable>
                {filteredRows.length === 0 ? (
                  <div className='mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed p-3 text-sm text-muted-foreground'>
                    <span>No staff members match the current filters.</span>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => table.resetColumnFilters()}
                    >
                      Reset filters
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value='roles' className='space-y-4'>
          <Card>
            <CardHeader>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <CardTitle>Organisation roles</CardTitle>
                  <CardDescription>
                    Create reusable school roles like Accounts Staff, Teacher, or Teacher Assistant,
                    then assign them from the staff permissions table.
                  </CardDescription>
                </div>
                <Button
                  type='button'
                  onClick={() => {
                    setEditingRoleTemplate(null);
                    setRoleEditorOpen(true);
                  }}
                >
                  New role
                </Button>
              </div>
            </CardHeader>
            <CardContent className='grid gap-3'>
              {availableRoleTemplates.length === 0 ? (
                <div className='rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
                  No custom organisation roles yet. Create one here, then assign it to staff from
                  the Staff permissions tab.
                </div>
              ) : (
                <div className='grid gap-3 lg:grid-cols-2'>
                  {availableRoleTemplates.map((roleTemplate) => (
                    <div
                      key={roleTemplate.id}
                      className='rounded-2xl border border-border/60 bg-background p-4'
                    >
                      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                        <div className='space-y-2'>
                          <div className='text-sm font-semibold'>{roleTemplate.name}</div>
                          <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                            <Badge variant='secondary'>
                              {roleTemplate.assignmentCount} assigned
                            </Badge>
                            <Badge variant='outline'>
                              {roleTemplate.permissionCount} permissions
                            </Badge>
                            <Badge variant='outline'>
                              Updated {formatTimestamp(roleTemplate.updatedAt)}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setEditingRoleTemplate(roleTemplate);
                            setRoleEditorOpen(true);
                          }}
                        >
                          Edit role
                        </Button>
                      </div>
                      <div className='text-muted-foreground mt-3 text-sm'>
                        {getPermissionSummary(roleTemplate.permissions)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='workspace'>
          <Card>
            <CardHeader>
              <CardTitle>Workspace settings</CardTitle>
              <CardDescription>
                Keep Clerk’s underlying organisation management available for invitations,
                membership, and workspace-level maintenance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationProfile />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {orgId ? (
        <>
          <AccessEditorSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            rows={editingRows}
            orgId={orgId}
            roleTemplates={availableRoleTemplates}
          />
          <RoleTemplateEditorSheet
            open={roleEditorOpen}
            onOpenChange={setRoleEditorOpen}
            orgId={orgId}
            roleTemplate={editingRoleTemplate}
          />
        </>
      ) : null}
    </>
  );
}
