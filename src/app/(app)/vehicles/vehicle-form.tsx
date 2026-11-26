"use client";
import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import {
  CATEGORY_LABELS,
  COMMON_BODY_TYPES,
  COMMON_COLORS,
  DISTRICT_LABELS,
  FUEL_LABELS,
  STATUS_LABELS,
  TRANSMISSION_LABELS,
} from "@/lib/constants";
import type { VehicleFormState } from "./actions";

export type VehicleFormValues = Partial<Record<string, string | number | null>>;

export function VehicleForm({
  action,
  defaults = {},
  suggestions,
  cancelHref,
  submitLabel,
}: {
  action: (state: VehicleFormState, fd: FormData) => Promise<VehicleFormState>;
  defaults?: VehicleFormValues;
  suggestions: { manufacturers: string[]; models: string[]; areas: string[] };
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const d = (k: string) => (defaults[k] === null || defaults[k] === undefined ? "" : String(defaults[k]));
  const year = new Date().getFullYear();

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertCircle className="size-4" /> {state.error}
        </div>
      )}
      <datalist id="dl-manufacturers">{suggestions.manufacturers.map((m) => <option key={m} value={m} />)}</datalist>
      <datalist id="dl-models">{suggestions.models.map((m) => <option key={m} value={m} />)}</datalist>
      <datalist id="dl-areas">{suggestions.areas.map((m) => <option key={m} value={m} />)}</datalist>
      <datalist id="dl-colors">{COMMON_COLORS.map((m) => <option key={m} value={m} />)}</datalist>
      <datalist id="dl-body">{COMMON_BODY_TYPES.map((m) => <option key={m} value={m} />)}</datalist>

      <Card>
        <CardHeader title="Identification" description="Registration and classification" />
        <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Registration number" htmlFor="registrationNumber" required error={fe.registrationNumber} hint="Normalised automatically, e.g. “abc 123” → ABC-123">
            <Input id="registrationNumber" name="registrationNumber" defaultValue={d("registrationNumber")} className="font-mono uppercase" aria-invalid={!!fe.registrationNumber} required />
          </Field>
          <Field label="Vehicle category" htmlFor="category" required error={fe.category}>
            <Select id="category" name="category" defaultValue={d("category")} aria-invalid={!!fe.category}>
              <option value="">Select category…</option>
              {Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Vehicle status" htmlFor="status" error={fe.status}>
            <Select id="status" name="status" defaultValue={d("status") || "ACTIVE"}>
              {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Manufacturer" htmlFor="manufacturer" required error={fe.manufacturer}>
            <Input id="manufacturer" name="manufacturer" list="dl-manufacturers" defaultValue={d("manufacturer")} aria-invalid={!!fe.manufacturer} />
          </Field>
          <Field label="Model" htmlFor="model" required error={fe.model}>
            <Input id="model" name="model" list="dl-models" defaultValue={d("model")} aria-invalid={!!fe.model} />
          </Field>
          <Field label="Variant" htmlFor="variant" error={fe.variant}>
            <Input id="variant" name="variant" defaultValue={d("variant")} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Specifications" description="Technical and physical attributes" />
        <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Manufacturing year" htmlFor="manufacturingYear" error={fe.manufacturingYear}>
            <Input id="manufacturingYear" name="manufacturingYear" type="number" min={1900} max={year + 1} defaultValue={d("manufacturingYear")} aria-invalid={!!fe.manufacturingYear} />
          </Field>
          <Field label="Engine capacity (CC)" htmlFor="engineCapacityCc" error={fe.engineCapacityCc}>
            <Input id="engineCapacityCc" name="engineCapacityCc" type="number" min={0} max={30000} defaultValue={d("engineCapacityCc")} aria-invalid={!!fe.engineCapacityCc} />
          </Field>
          <Field label="Fuel type" htmlFor="fuelType" error={fe.fuelType}>
            <Select id="fuelType" name="fuelType" defaultValue={d("fuelType")}>
              <option value="">Not specified</option>
              {Object.entries(FUEL_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Transmission" htmlFor="transmission" error={fe.transmission}>
            <Select id="transmission" name="transmission" defaultValue={d("transmission")}>
              <option value="">Not specified</option>
              {Object.entries(TRANSMISSION_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Vehicle color" htmlFor="color" error={fe.color}>
            <Input id="color" name="color" list="dl-colors" defaultValue={d("color")} />
          </Field>
          <Field label="Body type" htmlFor="bodyType" error={fe.bodyType}>
            <Input id="bodyType" name="bodyType" list="dl-body" defaultValue={d("bodyType")} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Registration & provenance" description="Where and when the vehicle was registered, and where this record came from" />
        <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Registration year" htmlFor="registrationYear" error={fe.registrationYear}>
            <Input id="registrationYear" name="registrationYear" type="number" min={1900} max={year + 1} defaultValue={d("registrationYear")} aria-invalid={!!fe.registrationYear} />
          </Field>
          <Field label="Registration date" htmlFor="registrationDate" error={fe.registrationDate} hint="Optional — enables monthly trend analysis">
            <Input id="registrationDate" name="registrationDate" type="date" defaultValue={d("registrationDate")} aria-invalid={!!fe.registrationDate} />
          </Field>
          <Field label="Data source" htmlFor="dataSource" error={fe.dataSource} hint="e.g. Excise & Taxation record, dealer survey">
            <Input id="dataSource" name="dataSource" defaultValue={d("dataSource")} placeholder="Manual entry" />
          </Field>
          <Field label="Registration district" htmlFor="district" error={fe.district}>
            <Select id="district" name="district" defaultValue={d("district")} aria-invalid={!!fe.district}>
              <option value="">Not recorded</option>
              {Object.entries(DISTRICT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Registration area" htmlFor="area" error={fe.area} hint="Locality within the district">
            <Input id="area" name="area" list="dl-areas" defaultValue={d("area")} />
          </Field>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} {submitLabel}
        </Button>
      </div>
    </form>
  );
}
