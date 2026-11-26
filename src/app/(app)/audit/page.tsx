import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, formatNumber, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit Logs" };

const ACTIONS = [
  "LOGIN", "LOGIN_FAILED", "LOGOUT", "PASSWORD_CHANGE", "VEHICLE_CREATE", "VEHICLE_UPDATE", "VEHICLE_DELETE",
  "IMPORT", "IMPORT_VALIDATE", "EXPORT", "USER_CREATE", "USER_UPDATE", "USER_PASSWORD_RESET", "SYNTHETIC_PURGE",
];
const tone = (a: string) =>
  a.includes("DELETE") || a.includes("FAILED") || a.includes("PURGE") ? "danger" : a.includes("CREATE") || a === "IMPORT" ? "success" : a.includes("UPDATE") || a.includes("RESET") ? "warning" : a === "EXPORT" ? "primary" : "neutral";

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermission("audit:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const take = 50;
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.action && ACTIONS.includes(sp.action) && { action: sp.action }),
    ...(sp.user && { userEmail: { contains: sp.user, mode: "insensitive" } }),
    ...(sp.q && { summary: { contains: sp.q, mode: "insensitive" } }),
    ...((sp.from || sp.to) && {
      createdAt: { ...(sp.from && { gte: new Date(sp.from) }), ...(sp.to && { lte: new Date(`${sp.to}T23:59:59`) }) },
    }),
  };
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));
  const qs = (p: number) => new URLSearchParams({ ...(Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>), page: String(p) }).toString();

  return (
    <>
      <PageHeader eyebrow="Administration" title="Audit logs" description="An immutable record of sign-ins, data changes, imports, exports and account administration." />
      <Card className="mb-6">
        <form method="get" className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_200px_200px_150px_150px_auto]">
          <Input name="q" defaultValue={sp.q} placeholder="Search summaries…" aria-label="Search summaries" />
          <Select name="action" defaultValue={sp.action ?? ""} aria-label="Action">
            <option value="">All actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{titleCase(a)}</option>)}
          </Select>
          <Input name="user" defaultValue={sp.user} placeholder="User email" aria-label="User email" />
          <Input name="from" type="date" defaultValue={sp.from} aria-label="From date" />
          <Input name="to" type="date" defaultValue={sp.to} aria-label="To date" />
          <div className="flex gap-2">
            <Button type="submit">Filter</Button>
            <Button variant="ghost" asChild><Link href="/audit">Reset</Link></Button>
          </div>
        </form>
      </Card>
      <Card>
        <div className="border-b border-border px-5 py-3 text-sm text-muted"><b className="tabular text-foreground">{formatNumber(total)}</b> events</div>
        {logs.length === 0 ? (
          <EmptyState title="No audit events match" />
        ) : (
          <Table>
            <THead><tr><TH>Time (PKT)</TH><TH>Action</TH><TH>Summary</TH><TH>User</TH><TH>IP address</TH></tr></THead>
            <tbody>
              {logs.map((l) => (
                <TR key={l.id}>
                  <TD className="tabular text-muted">{formatDateTime(l.createdAt)}</TD>
                  <TD><Badge tone={tone(l.action)}>{titleCase(l.action)}</Badge></TD>
                  <TD className="max-w-xl whitespace-normal">
                    {l.entityType === "Vehicle" && l.entityId && !l.action.includes("DELETE") ? (
                      <Link href={`/vehicles/${l.entityId}`} className="hover:text-primary">{l.summary}</Link>
                    ) : l.entityType === "ImportBatch" && l.entityId ? (
                      <Link href={`/data/import/${l.entityId}`} className="hover:text-primary">{l.summary}</Link>
                    ) : (
                      l.summary
                    )}
                  </TD>
                  <TD className="text-muted">{l.userEmail ?? "—"}</TD>
                  <TD className="font-mono text-xs text-muted">{l.ipAddress ?? "—"}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted">
            Page {page} of {pages}
            <div className="flex gap-2">
              {page > 1 && <Button variant="secondary" size="sm" asChild><Link href={`/audit?${qs(page - 1)}`}>Previous</Link></Button>}
              {page < pages && <Button variant="secondary" size="sm" asChild><Link href={`/audit?${qs(page + 1)}`}>Next</Link></Button>}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
