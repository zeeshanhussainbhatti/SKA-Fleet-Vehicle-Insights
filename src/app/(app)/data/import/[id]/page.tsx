import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader, EmptyState } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, formatNumber, titleCase } from "@/lib/utils";
import { importStatusTone } from "@/lib/ui-helpers";

export const metadata: Metadata = { title: "Import batch" };

const KIND_LABEL: Record<string, { label: string; tone: "danger" | "warning" | "neutral" }> = {
  VALIDATION: { label: "Validation", tone: "danger" },
  DUPLICATE_IN_FILE: { label: "Duplicate in file", tone: "warning" },
  DUPLICATE_IN_DB: { label: "Already in database", tone: "neutral" },
};

export default async function BatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const user = await requirePermission("data:import");
  const { id } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const batch = await prisma.importBatch.findUnique({ where: { id }, include: { user: { select: { name: true } } } });
  if (!batch || (batch.userId !== user.id && !can(user.role, "data:import-history-all"))) notFound();
  const take = 100;
  const [errors, errorCount] = await Promise.all([
    prisma.importError.findMany({ where: { batchId: id }, orderBy: [{ rowNumber: "asc" }], skip: (page - 1) * take, take }),
    prisma.importError.count({ where: { batchId: id } }),
  ]);
  const pages = Math.ceil(errorCount / take);

  return (
    <>
      <Link href="/data/import" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-foreground"><ArrowLeft className="size-4" /> Import history</Link>
      <PageHeader
        eyebrow={batch.dryRun ? "Validation run" : "Import batch"}
        title={batch.fileName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={importStatusTone(batch.status)}>{titleCase(batch.status)}</Badge>
            <span>{formatDateTime(batch.createdAt)} · {batch.user?.name ?? "unknown user"} · source “{batch.dataSource}”</span>
          </span>
        }
        actions={
          <>
            {errorCount > 0 && <Button variant="secondary" size="sm" asChild><a href={`/api/import/${batch.id}/errors`}><Download /> Error report (CSV)</a></Button>}
            {batch.insertedRows > 0 && <Button size="sm" asChild><Link href={`/vehicles?source=${encodeURIComponent(batch.dataSource)}`}>View imported records</Link></Button>}
          </>
        }
      />
      {batch.message && <div className="mb-6 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-muted">{batch.message}</div>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard label="Rows read" value={batch.totalRows} />
        <KpiCard label="Inserted" value={batch.insertedRows} />
        <KpiCard label="Updated" value={batch.updatedRows} />
        <KpiCard label="Duplicates" value={batch.duplicateRows} />
        <KpiCard label="Rows with errors" value={batch.errorRows} />
      </div>
      <Card className="mt-6">
        <CardHeader title="Row issues" description={`${formatNumber(errorCount)} issue(s) recorded — row numbers refer to the spreadsheet (header = row 1)`} />
        {errors.length === 0 ? (
          <EmptyState title="No issues" description="Every row passed validation." />
        ) : (
          <Table>
            <THead><tr><TH>Row</TH><TH>Type</TH><TH>Field</TH><TH>Message</TH></tr></THead>
            <tbody>
              {errors.map((e) => (
                <TR key={e.id}>
                  <TD className="tabular font-mono text-xs">{e.rowNumber}</TD>
                  <TD><Badge tone={KIND_LABEL[e.kind]?.tone ?? "neutral"}>{KIND_LABEL[e.kind]?.label ?? e.kind}</Badge></TD>
                  <TD className="font-mono text-xs text-muted">{e.field ?? "—"}</TD>
                  <TD className="whitespace-normal">{e.message}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted">
            Page {page} of {pages}
            <div className="flex gap-2">
              {page > 1 && <Button variant="secondary" size="sm" asChild><Link href={`?page=${page - 1}`}>Previous</Link></Button>}
              {page < pages && <Button variant="secondary" size="sm" asChild><Link href={`?page=${page + 1}`}>Next</Link></Button>}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
