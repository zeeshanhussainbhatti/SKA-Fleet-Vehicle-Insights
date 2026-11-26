import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileClock, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { IMPORT_FIELDS } from "@/lib/vehicle-schema";
import { SYNTHETIC_SOURCE } from "@/lib/constants";
import { formatBytes, formatDateTime, formatNumber, titleCase } from "@/lib/utils";
import { importStatusTone } from "@/lib/ui-helpers";
import { UploadForm } from "./upload-form";
import { PurgeSyntheticButton } from "./purge-button";

export const metadata: Metadata = { title: "Import & History" };

export default async function ImportPage() {
  const user = await requirePermission("data:import");
  const seeAll = can(user.role, "data:import-history-all");
  const [batches, synthetic] = await Promise.all([
    prisma.importBatch.findMany({
      where: seeAll ? {} : { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true } } },
    }),
    can(user.role, "data:purge-synthetic") ? prisma.vehicle.count({ where: { dataSource: SYNTHETIC_SOURCE } }) : Promise.resolve(0),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Data Management"
        title="Import & history"
        description="Bulk-upload vehicle records from CSV or Excel. Every row is validated, normalised and checked for duplicates before it is written."
        actions={
          <>
            <Button variant="secondary" size="sm" asChild><a href="/api/import/template?format=csv"><Download /> CSV template</a></Button>
            <Button variant="secondary" size="sm" asChild><a href="/api/import/template?format=xlsx"><Download /> Excel template</a></Button>
          </>
        }
      />

      {synthetic > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning sm:flex-row sm:items-center sm:justify-between">
          <span><b>{formatNumber(synthetic)}</b> synthetic demo records are in the database. Remove them before using the platform for real reporting.</span>
          <PurgeSyntheticButton count={synthetic} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Bulk record upload" description="CSV (UTF-8) or Excel .xlsx — first worksheet, first row as headers" />
          <CardBody><UploadForm /></CardBody>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Validation rules</span>} description="Headers are matched flexibly (e.g. “Make” → Manufacturer)" />
          <CardBody className="space-y-3 text-[13px]">
            <ul className="space-y-1.5">
              {IMPORT_FIELDS.map((f) => (
                <li key={f.field} className="flex items-center justify-between gap-3">
                  <span className="text-foreground">{f.header}</span>
                  {f.required ? <Badge tone="primary">Required</Badge> : <span className="text-xs text-subtle">Optional</span>}
                </li>
              ))}
            </ul>
            <div className="space-y-1.5 border-t border-border pt-3 text-xs leading-relaxed text-muted">
              <p>• Registration numbers are normalised (upper-case, single dashes) and must be unique.</p>
              <p>• Duplicates within the file are rejected; duplicates of existing records are skipped or updated per your choice.</p>
              <p>• Years must be 1900–next year; registration cannot precede manufacture; dates use YYYY-MM-DD.</p>
              <p>• Categories, fuel, transmission, district and status accept common aliases (e.g. “Bike”, “District South”).</p>
              <p>• Unknown manufacturers, models and areas are created automatically.</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title={<span className="flex items-center gap-2"><FileClock className="size-4 text-muted" /> Import history</span>} description={seeAll ? "All imports across the organisation (latest 50)" : "Your imports (latest 50)"} />
        {batches.length === 0 ? (
          <EmptyState title="No imports yet" description="Uploaded files and their outcomes will be listed here." />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>File</TH><TH>Status</TH><TH className="text-right">Rows</TH><TH className="text-right">Inserted</TH><TH className="text-right">Updated</TH><TH className="text-right">Duplicates</TH><TH className="text-right">Errors</TH><TH>By</TH><TH>When</TH>
              </tr>
            </THead>
            <tbody>
              {batches.map((b) => (
                <TR key={b.id}>
                  <TD>
                    <Link href={`/data/import/${b.id}`} className="font-medium text-primary hover:underline">{b.fileName}</Link>
                    <div className="text-xs text-subtle">{b.fileType} · {formatBytes(b.fileSizeBytes)} · {b.duplicateStrategy === "UPDATE" ? "update duplicates" : "skip duplicates"}</div>
                  </TD>
                  <TD><Badge tone={importStatusTone(b.status)}>{titleCase(b.status)}</Badge></TD>
                  <TD className="tabular text-right">{formatNumber(b.totalRows)}</TD>
                  <TD className="tabular text-right">{formatNumber(b.insertedRows)}</TD>
                  <TD className="tabular text-right">{formatNumber(b.updatedRows)}</TD>
                  <TD className="tabular text-right">{formatNumber(b.duplicateRows)}</TD>
                  <TD className={`tabular text-right ${b.errorRows ? "font-semibold text-danger" : ""}`}>{formatNumber(b.errorRows)}</TD>
                  <TD className="text-muted">{b.user?.name ?? "—"}</TD>
                  <TD className="text-muted">{formatDateTime(b.createdAt)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
