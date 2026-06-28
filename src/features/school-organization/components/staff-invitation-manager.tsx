'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  DASHBOARD_PERMISSION_CATALOG,
  DASHBOARD_ROLE_OPTIONS,
  type DashboardPermissionKey,
  type DashboardRole,
  normalizeDashboardPermissions,
  permissionSetForRole
} from '@/lib/school-permissions';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

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

type StaffInviteRecord = {
  id: Id<'schoolStaffInvites'>;
  email: string;
  clerkInvitationId: string;
  clerkRole: string;
  batchLabel: string | null;
  dashboardRole: string;
  roleTemplateId: Id<'schoolDashboardRoles'> | null;
  permissions: DashboardPermissionKey[];
  permissionCount: number;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invitedByUserId: string;
  invitedAt: number;
  lastSentAt: number;
  sendCount: number;
  updatedAt: number;
  claimedByUserId: string | null;
  acceptedAt: number | null;
  revokedAt: number | null;
};

type RoleOption = {
  value: string;
  label: string;
  permissions: DashboardPermissionKey[];
  roleTemplateId: Id<'schoolDashboardRoles'> | null;
};

const CUSTOM_ROLE_VALUE = '__custom__';
const ROLE_TEMPLATE_VALUE_PREFIX = 'template:';

function toTemplateRoleValue(roleTemplateId: Id<'schoolDashboardRoles'>) {
  return `${ROLE_TEMPLATE_VALUE_PREFIX}${roleTemplateId}`;
}

function parseInviteEmails(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildRoleOptions(roleTemplates: RoleTemplateRecord[]): RoleOption[] {
  const presetRoles = DASHBOARD_ROLE_OPTIONS.filter(
    (role): role is Exclude<DashboardRole, 'Inherited' | 'Custom'> =>
      role !== 'Inherited' && role !== 'Custom'
  ).map((role) => ({
    value: role,
    label: role,
    permissions: normalizeDashboardPermissions(permissionSetForRole(role)),
    roleTemplateId: null
  }));

  const templateRoles = roleTemplates.map((roleTemplate) => ({
    value: toTemplateRoleValue(roleTemplate.id),
    label: `${roleTemplate.name} template`,
    permissions: normalizeDashboardPermissions(roleTemplate.permissions),
    roleTemplateId: roleTemplate.id
  }));

  return [
    ...presetRoles,
    ...templateRoles,
    {
      value: CUSTOM_ROLE_VALUE,
      label: 'Custom access profile',
      permissions: [],
      roleTemplateId: null
    }
  ];
}

function getStatusTone(status: StaffInviteRecord['status']) {
  switch (status) {
    case 'accepted': {
      return 'default';
    }
    case 'pending': {
      return 'secondary';
    }
    case 'revoked': {
      return 'destructive';
    }
    default: {
      return 'outline';
    }
  }
}

function formatWhen(timestamp: number | null) {
  if (!timestamp) {
    return '—';
  }

  return formatDistanceToNow(timestamp, { addSuffix: true });
}

export default function StaffInvitationManager({
  orgId,
  roleTemplates
}: {
  orgId: string;
  roleTemplates: RoleTemplateRecord[];
}) {
  const { organization, isLoaded } = useOrganization();
  const invites = useQuery(api.schoolOrganization.listStaffInvites, orgId ? { orgId } : 'skip') as
    | StaffInviteRecord[]
    | undefined;
  const saveInvites = useMutation(api.schoolOrganization.upsertStaffInvites);
  const syncInviteStatuses = useMutation(api.schoolOrganization.syncStaffInviteStatuses);

  const roleOptions = useMemo(() => buildRoleOptions(roleTemplates), [roleTemplates]);
  const [inviteMode, setInviteMode] = useState<'single' | 'group'>('single');
  const [selectedRoleValue, setSelectedRoleValue] = useState<string>(
    roleOptions[0]?.value ?? 'Teacher'
  );
  const [singleEmail, setSingleEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [batchLabel, setBatchLabel] = useState('');
  const [customRoleLabel, setCustomRoleLabel] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<DashboardPermissionKey[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [hasSyncedStatuses, setHasSyncedStatuses] = useState(false);

  const selectedRole =
    roleOptions.find((roleOption) => roleOption.value === selectedRoleValue) ??
    roleOptions[0] ??
    null;

  useEffect(() => {
    if (!selectedRole) {
      return;
    }

    if (selectedRole.value === CUSTOM_ROLE_VALUE) {
      return;
    }

    setSelectedPermissions(selectedRole.permissions);
    if (!customRoleLabel) {
      setCustomRoleLabel(selectedRole.label.replace(/ template$/, ''));
    }
  }, [customRoleLabel, selectedRole]);

  useEffect(() => {
    if (!isLoaded || !organization || hasSyncedStatuses) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await organization.getInvitations();
        if (cancelled || response.data.length === 0) {
          setHasSyncedStatuses(true);
          return;
        }

        await syncInviteStatuses({
          orgId,
          statuses: response.data.map((invitation) => ({
            clerkInvitationId: invitation.id,
            status: invitation.status
          }))
        });
        if (!cancelled) {
          setHasSyncedStatuses(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasSyncedStatuses, isLoaded, organization, orgId, syncInviteStatuses]);

  const emails = useMemo(
    () =>
      inviteMode === 'single' ? parseInviteEmails(singleEmail) : parseInviteEmails(bulkEmails),
    [bulkEmails, inviteMode, singleEmail]
  );

  const invalidEmails = emails.filter((email) => !isEmailAddress(email));

  const effectivePermissions =
    selectedRole?.value === CUSTOM_ROLE_VALUE
      ? normalizeDashboardPermissions(selectedPermissions)
      : normalizeDashboardPermissions(selectedRole?.permissions ?? []);
  const effectiveRoleLabel =
    selectedRole?.value === CUSTOM_ROLE_VALUE
      ? customRoleLabel.trim() || 'Custom access'
      : (selectedRole?.label.replace(/ template$/, '') ?? 'Staff');
  const effectiveRoleTemplateId =
    selectedRole?.value !== CUSTOM_ROLE_VALUE
      ? (selectedRole?.roleTemplateId ?? undefined)
      : undefined;

  const handlePermissionToggle = (permission: DashboardPermissionKey, checked: boolean) => {
    setSelectedPermissions((currentPermissions) =>
      checked
        ? normalizeDashboardPermissions([...currentPermissions, permission])
        : currentPermissions.filter((entry) => entry !== permission)
    );
  };

  const resetForm = () => {
    setSingleEmail('');
    setBulkEmails('');
    setBatchLabel('');
    setSelectedPermissions(selectedRole?.permissions ?? []);
  };

  const sendInvites = async () => {
    if (!organization) {
      toast.error('The school workspace is still loading.');
      return;
    }

    if (emails.length === 0) {
      toast.error('Add at least one email address to send invitations.');
      return;
    }

    if (invalidEmails.length > 0) {
      toast.error(`These email addresses are invalid: ${invalidEmails.join(', ')}`);
      return;
    }

    if (selectedRole?.value === CUSTOM_ROLE_VALUE && !customRoleLabel.trim()) {
      toast.error('Name the custom access profile before sending invites.');
      return;
    }

    if (effectivePermissions.length === 0) {
      toast.error('Select at least one dashboard permission for this invite.');
      return;
    }

    setSubmitting(true);

    try {
      const invitationResults =
        inviteMode === 'group'
          ? await organization.inviteMembers({ emailAddresses: emails, role: 'org:member' })
          : [await organization.inviteMember({ emailAddress: emails[0], role: 'org:member' })];

      await saveInvites({
        orgId,
        batchLabel: inviteMode === 'group' ? batchLabel.trim() || effectiveRoleLabel : undefined,
        dashboardRoleLabel: effectiveRoleLabel,
        roleTemplateId: effectiveRoleTemplateId,
        permissions: effectivePermissions,
        clerkRole: 'org:member',
        invitations: invitationResults.map((invitation) => ({
          email: invitation.emailAddress,
          clerkInvitationId: invitation.id,
          status: invitation.status
        }))
      });

      toast.success(
        invitationResults.length === 1
          ? `Invitation sent to ${invitationResults[0]?.emailAddress}.`
          : `Sent ${invitationResults.length} staff invitations.`
      );
      resetForm();
      setHasSyncedStatuses(false);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Could not send the invitations.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const revokeInvite = async (invite: StaffInviteRecord) => {
    if (!organization) {
      toast.error('The school workspace is still loading.');
      return;
    }

    setRevokingId(invite.id);
    try {
      const response = await organization.getInvitations({ status: ['pending'] });
      const pendingInvite = response.data.find((entry) => entry.id === invite.clerkInvitationId);

      if (!pendingInvite) {
        await syncInviteStatuses({
          orgId,
          statuses: [{ clerkInvitationId: invite.clerkInvitationId, status: 'expired' }]
        });
        toast.error('That invitation is no longer pending in Clerk.');
        return;
      }

      await pendingInvite.revoke();
      await syncInviteStatuses({
        orgId,
        statuses: [{ clerkInvitationId: invite.clerkInvitationId, status: 'revoked' }]
      });
      toast.success(`Revoked ${invite.email}.`);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Could not revoke the invitation.';
      toast.error(message);
    } finally {
      setRevokingId(null);
    }
  };

  const resendInvite = async (invite: StaffInviteRecord) => {
    if (!organization) {
      toast.error('The school workspace is still loading.');
      return;
    }

    setResendingId(invite.id);
    try {
      const freshInvite = await organization.inviteMember({
        emailAddress: invite.email,
        role: 'org:member'
      });

      await saveInvites({
        orgId,
        batchLabel: invite.batchLabel ?? undefined,
        dashboardRoleLabel: invite.dashboardRole,
        roleTemplateId: invite.roleTemplateId ?? undefined,
        permissions: invite.permissions,
        clerkRole: 'org:member',
        invitations: [
          {
            email: freshInvite.emailAddress,
            clerkInvitationId: freshInvite.id,
            status: freshInvite.status
          }
        ]
      });

      toast.success(`Resent the invitation to ${invite.email}.`);
      setHasSyncedStatuses(false);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Could not resend the invitation.';
      toast.error(message);
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-start gap-3'>
            <div className='rounded-full bg-primary/10 p-2 text-primary'>
              <span className='block text-sm font-semibold'>!</span>
            </div>
            <div className='space-y-1'>
              <CardTitle>Closed invite-only onboarding</CardTitle>
              <CardDescription>
                Staff can only join Schly after a school admin sends them an invitation with a
                pre-assigned dashboard access profile.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-6'>
          <Tabs
            value={inviteMode}
            onValueChange={(value) => setInviteMode(value as 'single' | 'group')}
            className='space-y-4'
          >
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='single'>Invite Staff</TabsTrigger>
              <TabsTrigger value='group'>Invite Staff Group</TabsTrigger>
            </TabsList>

            <TabsContent value='single' className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='single-email'>Staff email</Label>
                <Input
                  id='single-email'
                  type='email'
                  placeholder='teacher@school.com'
                  value={singleEmail}
                  onChange={(event) => setSingleEmail(event.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value='group' className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='batch-label'>Group label</Label>
                <Input
                  id='batch-label'
                  placeholder='Teachers · Term 1 onboarding'
                  value={batchLabel}
                  onChange={(event) => setBatchLabel(event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='bulk-emails'>Email list</Label>
                <Textarea
                  id='bulk-emails'
                  placeholder='teacher1@school.com&#10;teacher2@school.com&#10;teacher3@school.com'
                  value={bulkEmails}
                  onChange={(event) => setBulkEmails(event.target.value)}
                  rows={7}
                />
                <p className='text-muted-foreground text-xs'>
                  Separate emails with new lines, commas, or spaces.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className='grid gap-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label>Access profile</Label>
                <Select value={selectedRoleValue} onValueChange={setSelectedRoleValue}>
                  <SelectTrigger>
                    <SelectValue placeholder='Choose access profile' />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((roleOption) => (
                      <SelectItem key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRoleValue === CUSTOM_ROLE_VALUE ? (
                <div className='space-y-2'>
                  <Label htmlFor='custom-role-label'>Custom access profile name</Label>
                  <Input
                    id='custom-role-label'
                    placeholder='Support staff'
                    value={customRoleLabel}
                    onChange={(event) => setCustomRoleLabel(event.target.value)}
                  />
                </div>
              ) : null}

              <div className='rounded-lg border bg-muted/30 p-4 text-sm'>
                <div className='font-medium'>{effectiveRoleLabel}</div>
                <div className='text-muted-foreground mt-1'>
                  {effectivePermissions.length} dashboard permission
                  {effectivePermissions.length === 1 ? '' : 's'} selected.
                </div>
              </div>
            </div>

            <div className='space-y-3'>
              <div>
                <Label>Dashboard access included</Label>
                <p className='text-muted-foreground mt-1 text-sm'>
                  Adjust the exact staff access before you send the invite.
                </p>
              </div>
              <div className='grid gap-3 md:grid-cols-2'>
                {DASHBOARD_PERMISSION_CATALOG.map((permission) => {
                  const checked = effectivePermissions.includes(permission.key);
                  const disabled = selectedRoleValue !== CUSTOM_ROLE_VALUE;

                  return (
                    <div
                      key={permission.key}
                      className='flex gap-3 rounded-lg border p-3 text-sm transition hover:border-primary/40'
                    >
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={(value) =>
                          handlePermissionToggle(permission.key, value === true)
                        }
                      />
                      <div className='space-y-1'>
                        <div className='block font-medium'>{permission.label}</div>
                        <div className='text-muted-foreground block text-xs'>
                          {permission.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className='flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <div className='font-medium'>Ready to send</div>
              <div className='text-muted-foreground text-sm'>
                {emails.length} recipient{emails.length === 1 ? '' : 's'} · {effectiveRoleLabel}
              </div>
            </div>
            <Button onClick={sendInvites} disabled={submitting || !organization} className='gap-2'>
              {submitting ? <Icons.spinner className='size-4 animate-spin' /> : null}
              Send invitation{emails.length === 1 ? '' : 's'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitation activity</CardTitle>
          <CardDescription>
            Track every pending, accepted, revoked, or expired staff invitation for this school.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!invites ? (
            <div className='text-muted-foreground flex items-center gap-2 text-sm'>
              <Icons.spinner className='size-4 animate-spin' /> Loading invitations…
            </div>
          ) : invites.length === 0 ? (
            <div className='text-muted-foreground rounded-lg border border-dashed p-6 text-sm'>
              No invitations have been sent yet.
            </div>
          ) : (
            <div className='space-y-3'>
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className='flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between'
                >
                  <div className='space-y-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='flex items-center gap-2 font-medium'>
                        <span className='text-muted-foreground text-xs'>@</span>
                        {invite.email}
                      </div>
                      <Badge variant={getStatusTone(invite.status)}>{invite.status}</Badge>
                      {invite.batchLabel ? (
                        <Badge variant='outline'>{invite.batchLabel}</Badge>
                      ) : null}
                    </div>
                    <div className='text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm'>
                      <span>{invite.dashboardRole}</span>
                      <span>{invite.permissionCount} permissions</span>
                      <span>Sent {formatWhen(invite.lastSentAt)}</span>
                      {invite.status === 'accepted' ? (
                        <span>Accepted {formatWhen(invite.acceptedAt)}</span>
                      ) : null}
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {invite.permissions.slice(0, 4).map((permission) => (
                        <Badge key={permission} variant='secondary'>
                          {DASHBOARD_PERMISSION_CATALOG.find((entry) => entry.key === permission)
                            ?.label ?? permission}
                        </Badge>
                      ))}
                      {invite.permissions.length > 4 ? (
                        <Badge variant='secondary'>+{invite.permissions.length - 4} more</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      className='gap-2'
                      onClick={() => resendInvite(invite)}
                      disabled={resendingId === invite.id || !organization}
                    >
                      {resendingId === invite.id ? (
                        <Icons.spinner className='size-4 animate-spin' />
                      ) : null}
                      Resend
                    </Button>
                    <Button
                      type='button'
                      variant='destructive'
                      className='gap-2'
                      onClick={() => revokeInvite(invite)}
                      disabled={
                        revokingId === invite.id ||
                        !organization ||
                        invite.status === 'accepted' ||
                        invite.status === 'revoked'
                      }
                    >
                      {revokingId === invite.id ? (
                        <Icons.spinner className='size-4 animate-spin' />
                      ) : null}
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
