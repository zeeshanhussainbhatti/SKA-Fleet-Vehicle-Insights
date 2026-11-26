import type { Prisma } from "@prisma/client";
import {
  CATEGORY_LABELS,
  DISTRICT_LABELS,
  FUEL_LABELS,
  STATUS_LABELS,
  TRANSMISSION_LABELS,
} from "@/lib/constants";
import { normalizeRegistration } from "@/lib/vehicle-schema";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export const SORTABLE = {
  vehicleNo: "Vehicle ID",
  registrationNumber: "Registration No.",
  manufacturer: "Manufacturer",
  model: "Model",
  manufacturingYear: "Mfg. Year",
  registrationYear: "Reg. Year",
  engineCapacityCc: "Engine (CC)",
  createdAt: "Date Added",
  updatedAt: "Last Updated",
} as const;
export type SortKey = keyof typeof SORTABLE;

export const PAGE_SIZES = [25, 50, 100] as const;

export type VehicleFilters = {
  q?: string;
  reg?: string;
  manufacturer?: string;
  model?: string;
  category?: string[];
  fuel?: string[];
  transmission?: string;
  status?: string;
  color?: string;
  district?: string[];
  area?: string;
  yearFrom?: number;
  yearTo?: number;
  regYearFrom?: number;
  regYearTo?: number;
  ccMin?: number;
  ccMax?: number;
  source?: string;
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
};

function first(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
}
function many<T extends string>(v: string | string[] | undefined, allowed: Record<T, string>) {
  const arr = (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean);
  return arr.filter((s): s is T => s in allowed);
}
function int(v: string | string[] | undefined) {
  const s = first(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export function parseFilters(sp: SearchParamsRecord): VehicleFilters {
  const sort = first(sp.sort);
  const pageSize = int(sp.pageSize);
  return {
    q: first(sp.q),
    reg: first(sp.reg),
    manufacturer: first(sp.manufacturer),
    model: first(sp.model),
    category: many(sp.category, CATEGORY_LABELS),
    fuel: many(sp.fuel, FUEL_LABELS),
    transmission: many(sp.transmission, TRANSMISSION_LABELS)[0],
    status: many(sp.status, STATUS_LABELS)[0],
    color: first(sp.color),
    district: many(sp.district, DISTRICT_LABELS),
    area: first(sp.area),
    yearFrom: int(sp.yearFrom),
    yearTo: int(sp.yearTo),
    regYearFrom: int(sp.regYearFrom),
    regYearTo: int(sp.regYearTo),
    ccMin: int(sp.ccMin),
    ccMax: int(sp.ccMax),
    source: first(sp.source),
    sort: sort && sort in SORTABLE ? (sort as SortKey) : "createdAt",
    dir: first(sp.dir) === "asc" ? "asc" : "desc",
    page: Math.max(1, int(sp.page) ?? 1),
    pageSize: PAGE_SIZES.includes(pageSize as (typeof PAGE_SIZES)[number]) ? pageSize! : 25,
  };
}

const ci = (s: string) => ({ contains: s, mode: "insensitive" as const });

export function buildWhere(f: VehicleFilters): Prisma.VehicleWhereInput {
  const and: Prisma.VehicleWhereInput[] = [];

  if (f.q) {
    const normalized = normalizeRegistration(f.q);
    and.push({
      OR: [
        ...(normalized ? [{ registrationNumber: { contains: normalized } }] : []),
        { manufacturer: { name: ci(f.q) } },
        { model: { name: ci(f.q) } },
        { variant: ci(f.q) },
      ],
    });
  }
  if (f.reg) {
    const n = normalizeRegistration(f.reg);
    // Also match ignoring dashes ("ABC123" finds "ABC-123") via startsWith on normalised value
    and.push({ registrationNumber: { contains: n } });
  }
  if (f.manufacturer) and.push({ manufacturer: { name: ci(f.manufacturer) } });
  if (f.model) and.push({ model: { name: ci(f.model) } });
  if (f.category?.length) and.push({ category: { in: f.category as never } });
  if (f.fuel?.length) and.push({ fuelType: { in: f.fuel as never } });
  if (f.transmission) and.push({ transmission: f.transmission as never });
  if (f.status) and.push({ status: f.status as never });
  if (f.color) and.push({ color: ci(f.color) });
  if (f.district?.length) and.push({ district: { in: f.district as never } });
  if (f.area) and.push({ area: { name: ci(f.area) } });
  if (f.source) and.push({ dataSource: ci(f.source) });
  if (f.yearFrom !== undefined || f.yearTo !== undefined)
    and.push({ manufacturingYear: { gte: f.yearFrom, lte: f.yearTo } });
  if (f.regYearFrom !== undefined || f.regYearTo !== undefined)
    and.push({ registrationYear: { gte: f.regYearFrom, lte: f.regYearTo } });
  if (f.ccMin !== undefined || f.ccMax !== undefined)
    and.push({ engineCapacityCc: { gte: f.ccMin, lte: f.ccMax } });

  return and.length ? { AND: and } : {};
}

export function buildOrderBy(f: VehicleFilters): Prisma.VehicleOrderByWithRelationInput[] {
  const dir = f.dir;
  const nulls = { sort: dir, nulls: "last" as const };
  switch (f.sort) {
    case "manufacturer":
      return [{ manufacturer: { name: dir } }, { vehicleNo: "desc" }];
    case "model":
      return [{ model: { name: dir } }, { vehicleNo: "desc" }];
    case "manufacturingYear":
    case "registrationYear":
    case "engineCapacityCc":
      return [{ [f.sort]: nulls }, { vehicleNo: "desc" }];
    default:
      return [{ [f.sort]: dir }];
  }
}

export function countActiveFilters(f: VehicleFilters) {
  const keys: (keyof VehicleFilters)[] = [
    "q", "reg", "manufacturer", "model", "transmission", "status", "color", "area",
    "yearFrom", "yearTo", "regYearFrom", "regYearTo", "ccMin", "ccMax", "source",
  ];
  let n = keys.filter((k) => f[k] !== undefined).length;
  n += (f.category?.length ? 1 : 0) + (f.fuel?.length ? 1 : 0) + (f.district?.length ? 1 : 0);
  return n;
}

/** Serialise filters back to a query string (excluding paging when requested). */
export function filtersToQuery(f: VehicleFilters, overrides: Partial<Record<string, string | number | undefined>> = {}) {
  const p = new URLSearchParams();
  const put = (k: string, v: unknown) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) {
      if (v.length) p.set(k, v.join(","));
    } else p.set(k, String(v));
  };
  for (const [k, v] of Object.entries(f)) put(k, v);
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) p.delete(k);
    else p.set(k, String(v));
  }
  return p.toString();
}

export const vehicleListInclude = {
  manufacturer: { select: { name: true } },
  model: { select: { name: true } },
  area: { select: { name: true } },
} satisfies Prisma.VehicleInclude;
