import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { formatVehicleId } from "@/lib/utils";
import { VehicleForm } from "../../vehicle-form";
import { updateVehicleAction } from "../../actions";
import { getFormSuggestions } from "../../suggestions";

export const metadata: Metadata = { title: "Edit vehicle" };

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("vehicle:update");
  const { id } = await params;
  const v = await prisma.vehicle.findUnique({ where: { id }, include: { manufacturer: true, model: true, area: true } });
  if (!v) notFound();
  const suggestions = await getFormSuggestions();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow={formatVehicleId(v.vehicleNo)} title={`Edit ${v.registrationNumber}`} description="Every change is recorded in the audit log with before/after values." />
      <VehicleForm
        action={updateVehicleAction.bind(null, v.id)}
        suggestions={suggestions}
        cancelHref={`/vehicles/${v.id}`}
        submitLabel="Save changes"
        defaults={{
          registrationNumber: v.registrationNumber,
          category: v.category,
          status: v.status,
          manufacturer: v.manufacturer.name,
          model: v.model.name,
          variant: v.variant,
          manufacturingYear: v.manufacturingYear,
          registrationYear: v.registrationYear,
          registrationDate: v.registrationDate ? v.registrationDate.toISOString().slice(0, 10) : null,
          engineCapacityCc: v.engineCapacityCc,
          fuelType: v.fuelType,
          transmission: v.transmission,
          color: v.color,
          bodyType: v.bodyType,
          district: v.district,
          area: v.area?.name ?? null,
          dataSource: v.dataSource,
        }}
      />
    </div>
  );
}
