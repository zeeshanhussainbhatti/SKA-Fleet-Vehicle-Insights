import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { VehicleForm } from "../vehicle-form";
import { createVehicleAction } from "../actions";
import { getFormSuggestions } from "../suggestions";

export const metadata: Metadata = { title: "Add vehicle" };

export default async function NewVehiclePage() {
  await requirePermission("vehicle:create");
  const suggestions = await getFormSuggestions();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Vehicle Database" title="Add vehicle record" description="Records are validated and checked for duplicate registration numbers before saving." />
      <VehicleForm action={createVehicleAction} suggestions={suggestions} cancelHref="/vehicles" submitLabel="Create record" />
    </div>
  );
}
