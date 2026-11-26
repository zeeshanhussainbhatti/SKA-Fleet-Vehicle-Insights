import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { assignableRoles, can, canManageRole, ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { CreateUserDialog, EditUserDialog, ResetPasswordDialog } from "./user-dialogs";

export const metadata: Metadata = { title: "Users & Roles" };

const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "DATA_MANAGER", "VIEWER"];
const PERM_LABELS: [Permission, string][] = [
  ["dashboard:view", "View dashboards & analytics"],
  ["vehicle:view", "Search & view records"],
  ["vehicle:export", "Export data & reports"],
  ["vehicle:create", "Create records"],
  ["vehicle:update", "Edit records"],
  ["data:import", "Bulk import"],
  ["vehicle:delete", "Delete records"],
  ["data:import-history-all", "View all import history"],
  ["user:manage", "Manage user accounts"],
  ["audit:view", "View audit logs"],
  ["data:purge-synthetic", "Purge synthetic data"],
];

const roleTone = (r: Role) => (r === "SUPER_ADMIN" ? "navy" : r === "ADMIN" ? "primary" : r === "DATA_MANAGER" ? "success" : "neutral");

export default async function UsersPage() {
  const me = await requirePermission("user:view");
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true, createdAt: true, lockedUntil: true },
  });
  const manage = can(me.role, "user:manage");
  const roles = assignableRoles(me.role);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users & roles"
        description="Manage who can access SKA-VI and what they can do. Role and status changes take effect immediately."
        actions={manage ? <CreateUserDialog roles={roles} /> : undefined}
      />
      <Card>
        <Table>
          <THead>
            <tr><TH>User</TH><TH>Role</TH><TH>Status</TH><TH>Last sign-in</TH><TH>Created</TH><TH className="text-right">Actions</TH></tr>
          </THead>
          <tbody>
            {users.map((u) => {
              const editable = manage && canManageRole(me.role, u.role);
              const locked = u.lockedUntil && u.lockedUntil > new Date();
              return (
                <TR key={u.id}>
                  <TD>
                    <div className="font-medium">{u.name}{u.id === me.id && <span className="ml-2 text-xs text-subtle">(you)</span>}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </TD>
                  <TD><Badge tone={roleTone(u.role)}>{ROLE_LABELS[u.role]}</Badge></TD>
                  <TD>
                    {u.status === "ACTIVE" ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Suspended</Badge>}
                    {locked && <Badge tone="warning" className="ml-1">Locked</Badge>}
                  </TD>
                  <TD className="text-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</TD>
                  <TD className="text-muted">{formatDateTime(u.createdAt)}</TD>
                  <TD className="text-right">
                    {editable && (
                      <div className="inline-flex gap-1">
                        <EditUserDialog user={u} roles={roles} isSelf={u.id === me.id} />
                        <ResetPasswordDialog user={u} />
                      </div>
                    )}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Role permissions" description="Access granted to each role. Administrators can only manage roles below their own." />
        <Table>
          <THead>
            <tr><TH>Permission</TH>{ROLES.map((r) => <TH key={r} className="text-center">{ROLE_LABELS[r]}</TH>)}</tr>
          </THead>
          <tbody>
            {PERM_LABELS.map(([p, l]) => (
              <TR key={p}>
                <TD>{l}</TD>
                {ROLES.map((r) => (
                  <TD key={r} className="text-center">
                    {ROLE_PERMISSIONS[r].includes(p) ? <Check className="mx-auto size-4 text-success" /> : <Minus className="mx-auto size-4 text-subtle" />}
                  </TD>
                ))}
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
