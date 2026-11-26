import "server-only";
import type { District, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { VehicleInput } from "@/lib/vehicle-schema";

type Tx = Prisma.TransactionClient | PrismaClient;

function canonicalName(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

/**
 * Resolves (and creates when missing) reference rows — manufacturer, model and
 * area — with a per-call memo so bulk imports don't hammer the database.
 */
export class ReferenceResolver {
  private manufacturers = new Map<string, string>();
  private models = new Map<string, string>();
  private areas = new Map<string, string>();

  constructor(private db: Tx = prisma) {}

  async manufacturerId(name: string) {
    const clean = canonicalName(name);
    const k = clean.toLowerCase();
    const cached = this.manufacturers.get(k);
    if (cached) return cached;
    const existing = await this.db.manufacturer.findFirst({
      where: { name: { equals: clean, mode: "insensitive" } },
      select: { id: true },
    });
    const id =
      existing?.id ??
      (
        await this.db.manufacturer.upsert({
          where: { name: clean },
          create: { name: clean },
          update: {},
          select: { id: true },
        })
      ).id;
    this.manufacturers.set(k, id);
    return id;
  }

  async modelId(manufacturerId: string, name: string) {
    const clean = canonicalName(name);
    const k = `${manufacturerId}:${clean.toLowerCase()}`;
    const cached = this.models.get(k);
    if (cached) return cached;
    const existing = await this.db.vehicleModel.findFirst({
      where: { manufacturerId, name: { equals: clean, mode: "insensitive" } },
      select: { id: true },
    });
    const id =
      existing?.id ??
      (
        await this.db.vehicleModel.upsert({
          where: { manufacturerId_name: { manufacturerId, name: clean } },
          create: { manufacturerId, name: clean },
          update: {},
          select: { id: true },
        })
      ).id;
    this.models.set(k, id);
    return id;
  }

  async areaId(district: District, name: string) {
    const clean = canonicalName(name);
    const k = `${district}:${clean.toLowerCase()}`;
    const cached = this.areas.get(k);
    if (cached) return cached;
    const existing = await this.db.area.findFirst({
      where: { district, name: { equals: clean, mode: "insensitive" } },
      select: { id: true },
    });
    const id =
      existing?.id ??
      (
        await this.db.area.upsert({
          where: { district_name: { district, name: clean } },
          create: { district, name: clean },
          update: {},
          select: { id: true },
        })
      ).id;
    this.areas.set(k, id);
    return id;
  }
}

/** Convert validated input into Prisma scalar data (resolving references). */
export async function toVehicleData(
  input: VehicleInput,
  resolver: ReferenceResolver,
  fallbackSource: string,
) {
  const manufacturerId = await resolver.manufacturerId(input.manufacturer);
  const modelId = await resolver.modelId(manufacturerId, input.model);
  const areaId = input.area && input.district ? await resolver.areaId(input.district, input.area) : null;
  return {
    registrationNumber: input.registrationNumber,
    category: input.category!,
    manufacturerId,
    modelId,
    variant: input.variant ?? null,
    manufacturingYear: input.manufacturingYear ?? null,
    registrationYear: input.registrationYear ?? input.registrationDate?.getUTCFullYear() ?? null,
    registrationDate: input.registrationDate ?? null,
    engineCapacityCc: input.engineCapacityCc ?? null,
    fuelType: input.fuelType ?? null,
    transmission: input.transmission ?? null,
    color: input.color ?? null,
    bodyType: input.bodyType ?? null,
    district: input.district ?? null,
    areaId,
    status: input.status,
    dataSource: input.dataSource ?? fallbackSource,
  } satisfies Prisma.VehicleUncheckedCreateInput;
}

/** Fields snapshot used for audit diffs. */
export function vehicleSnapshot(v: Record<string, unknown>) {
  const keys = [
    "registrationNumber", "category", "manufacturerId", "modelId", "variant", "manufacturingYear",
    "registrationYear", "registrationDate", "engineCapacityCc", "fuelType", "transmission", "color",
    "bodyType", "district", "areaId", "status", "dataSource",
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const val = v[k];
    out[k] = val instanceof Date ? val.toISOString().slice(0, 10) : (val ?? null);
  }
  return out;
}

export function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of Object.keys(after)) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changes[k] = { from: before[k], to: after[k] };
  }
  return changes;
}
