import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, History, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_LABELS,
  DISTRICT_LABELS,
  FUEL_LABELS,
  STATUS_LABELS,
  SYNTHETIC_SOURCE,
  TRANSMISSION_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatNumber, formatVehicleId } from "@/lib/utils";
import { DeleteVehicleButton } from "../delete-button";
import { statusTone } from "@/lib/ui-helpers";

export const metadata: Metadata = { title: "Vehicle record" };

function Item({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`mt-1 text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value ?? "—"}</dd>
    </div>
  );
}

export default async function VehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const user = await requirePermission("vehicle:view");
  const { id } = await params;
  const sp = await searchParams;
  const v = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      manufacturer: true,
      model: true,
      area: true,
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
      importBatch: { select: { id: true, fileName: true } },
    },
  });
  if (!v) notFound();
  const history = can(user.role, "audit:view") || can(user.role, "vehicle:update")
    ? await prisma.auditLog.findMany({ where: { entityType: "Vehicle", entityId: v.id }, orderBy: { createdAt: "desc" }, take: 25 })
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/vehicles" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Vehicle database
      </Link>
      {(sp.created || sp.updated) && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-4" /> Record {sp.created ? "created" : "updated"} successfully.
        </div>
      )}
      {v.dataSource === SYNTHETIC_SOURCE && (
        <div className="mb-5 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          This is a synthetic demo record generated for testing — it does not describe a real vehicle.
        </div>
      )}
      <PageHeader
        eyebrow={formatVehicleId(v.vehicleNo)}
        title={v.registrationNumber}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">
              {v.manufacturer.name} {v.model.name} {v.variant ?? ""}
            </span>
            <Badge tone="primary">{CATEGORY_LABELS[v.category]}</Badge>
            <Badge tone={statusTone(v.status)}>{STATUS_LABELS[v.status]}</Badge>
          </span>
        }
        actions={
          <>
            {can(user.role, "vehicle:delete") && <DeleteVehicleButton id={v.id} registration={v.registrationNumber} />}
            {can(user.role, "vehicle:update") && (
              <Button asChild>
                <Link href={`/vehicles/${v.id}/edit`}>
                  <Pencil /> Edit record
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Vehicle details" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                <Item label="Unique vehicle ID" value={formatVehicleId(v.vehicleNo)} mono />
                <Item label="Registration number" value={v.registrationNumber} mono />
                <Item label="Vehicle category" value={CATEGORY_LABELS[v.category]} />
                <Item label="Manufacturer" value={v.manufacturer.name} />
                <Item label="Model" value={v.model.name} />
                <Item label="Variant" value={v.variant} />
                <Item label="Manufacturing year" value={v.manufacturingYear} />
                <Item label="Engine capacity" value={v.engineCapacityCc !== null ? `${formatNumber(v.engineCapacityCc)} cc` : null} />
                <Item label="Fuel type" value={v.fuelType && FUEL_LABELS[v.fuelType]} />
                <Item label="Transmission" value={v.transmission && TRANSMISSION_LABELS[v.transmission]} />
                <Item label="Vehicle color" value={v.color} />
                <Item label="Body type" value={v.bodyType} />
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Registration" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                <Item label="Registration year" value={v.registrationYear} />
                <Item label="Registration date" value={v.registrationDate ? formatDate(v.registrationDate) : null} />
                <Item label="Vehicle status" value={STATUS_LABELS[v.status]} />
                <Item label="Registration district" value={v.district && DISTRICT_LABELS[v.district]} />
                <Item label="Registration area" value={v.area?.name} />
              </dl>
            </CardBody>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Record provenance" />
            <CardBody>
              <dl className="space-y-4">
                <Item label="Data source" value={v.dataSource} />
                <Item
                  label="Import batch"
                  value={
                    v.importBatch ? (
                      can(user.role, "data:import") ? (
                        <Link className="text-primary hover:underline" href={`/data/import/${v.importBatch.id}`}>{v.importBatch.fileName}</Link>
                      ) : (
                        v.importBatch.fileName
                      )
                    ) : (
                      "Manual entry"
                    )
                  }
                />
                <Item label="Record created" value={`${formatDateTime(v.createdAt)}${v.createdBy ? ` · ${v.createdBy.name}` : ""}`} />
                <Item label="Last updated" value={`${formatDateTime(v.updatedAt)}${v.updatedBy ? ` · ${v.updatedBy.name}` : ""}`} />
              </dl>
            </CardBody>
          </Card>
          {history.length > 0 && (
            <Card>
              <CardHeader title={<span className="flex items-center gap-2"><History className="size-4 text-muted" /> Change history</span>} />
              <CardBody>
                <ol className="relative space-y-4 border-l border-border pl-4">
                  {history.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-primary" />
                      <div className="text-[13px] font-medium text-foreground">{h.summary}</div>
                      <div className="text-xs text-muted">{formatDateTime(h.createdAt)} · {h.userEmail ?? "system"}</div>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )}
          <p className="px-1 text-xs leading-relaxed text-subtle">
            Personal ownership information is not stored in {"SKA-VI"} by design. Owner data may only be processed where legally authorised.
          </p>
        </div>
      </div>
    </div>
  );
}
