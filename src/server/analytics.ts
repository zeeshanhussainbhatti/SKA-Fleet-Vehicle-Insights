import "server-only";
import { Prisma, type District, type VehicleCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  CATEGORY_LABELS,
  COMMERCIAL_CATEGORIES,
  DISTRICT_LABELS,
  DISTRICTS,
  FUEL_LABELS,
  STATUS_LABELS,
  SYNTHETIC_SOURCE,
  TRANSMISSION_LABELS,
} from "@/lib/constants";

export type Datum = { key: string; label: string; value: number };

export type Scope = { district?: District; category?: VehicleCategory };

function scopeWhere(s: Scope): Prisma.VehicleWhereInput {
  return { ...(s.district && { district: s.district }), ...(s.category && { category: s.category }) };
}
function scopeSql(s: Scope) {
  const parts: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (s.district) parts.push(Prisma.sql`"district" = ${s.district}::"District"`);
  if (s.category) parts.push(Prisma.sql`"category" = ${s.category}::"VehicleCategory"`);
  return Prisma.join(parts, " AND ");
}

function labelled<T extends string>(rows: { key: T | null; value: number }[], labels: Record<T, string>, nullLabel = "Not specified") {
  return rows
    .map((r) => ({ key: r.key ?? "__null", label: r.key ? labels[r.key] : nullLabel, value: r.value }))
    .sort((a, b) => b.value - a.value);
}

export async function getKpis() {
  const since = new Date(Date.now() - 30 * 86400000);
  const [total, byCategory, manufacturers, models, last30, synthetic, latest] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.vehicle.findMany({ distinct: ["manufacturerId"], select: { manufacturerId: true } }).then((r) => r.length),
    prisma.vehicle.findMany({ distinct: ["modelId"], select: { modelId: true } }).then((r) => r.length),
    prisma.vehicle.count({ where: { createdAt: { gte: since } } }),
    prisma.vehicle.count({ where: { dataSource: SYNTHETIC_SOURCE } }),
    prisma.vehicle.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  const c = (k: VehicleCategory) => byCategory.find((r) => r.category === k)?._count._all ?? 0;
  return {
    total,
    cars: c("CAR"),
    suvs: c("SUV"),
    motorcycles: c("MOTORCYCLE"),
    rickshaws: c("RICKSHAW"),
    commercial: COMMERCIAL_CATEGORIES.reduce((s, k) => s + c(k), 0),
    manufacturers,
    models,
    last30,
    synthetic,
    lastAddedAt: latest?.createdAt ?? null,
  };
}

export async function categoryDistribution(s: Scope = {}): Promise<Datum[]> {
  const rows = await prisma.vehicle.groupBy({ by: ["category"], where: scopeWhere(s), _count: { _all: true } });
  return labelled(rows.map((r) => ({ key: r.category, value: r._count._all })), CATEGORY_LABELS);
}

export async function fuelDistribution(s: Scope = {}): Promise<Datum[]> {
  const rows = await prisma.vehicle.groupBy({ by: ["fuelType"], where: scopeWhere(s), _count: { _all: true } });
  return labelled(rows.map((r) => ({ key: r.fuelType, value: r._count._all })), FUEL_LABELS);
}

export async function transmissionDistribution(s: Scope = {}): Promise<Datum[]> {
  const rows = await prisma.vehicle.groupBy({ by: ["transmission"], where: scopeWhere(s), _count: { _all: true } });
  return labelled(rows.map((r) => ({ key: r.transmission, value: r._count._all })), TRANSMISSION_LABELS);
}

export async function statusDistribution(s: Scope = {}): Promise<Datum[]> {
  const rows = await prisma.vehicle.groupBy({ by: ["status"], where: scopeWhere(s), _count: { _all: true } });
  return labelled(rows.map((r) => ({ key: r.status, value: r._count._all })), STATUS_LABELS);
}

export async function districtDistribution(s: Scope = {}): Promise<Datum[]> {
  const rows = await prisma.vehicle.groupBy({ by: ["district"], where: scopeWhere(s), _count: { _all: true } });
  return labelled(rows.map((r) => ({ key: r.district, value: r._count._all })), DISTRICT_LABELS, "District not recorded");
}

export async function topManufacturers(s: Scope = {}, take = 10): Promise<Datum[]> {
  const rows = await prisma.vehicle.groupBy({
    by: ["manufacturerId"],
    where: scopeWhere(s),
    _count: { _all: true },
    orderBy: { _count: { manufacturerId: "desc" } },
    take,
  });
  const names = await prisma.manufacturer.findMany({
    where: { id: { in: rows.map((r) => r.manufacturerId) } },
    select: { id: true, name: true },
  });
  const map = new Map(names.map((n) => [n.id, n.name]));
  return rows.map((r) => ({ key: r.manufacturerId, label: map.get(r.manufacturerId) ?? "Unknown", value: r._count._all }));
}

export async function topModels(s: Scope = {}, take = 10): Promise<Datum[]> {
  const rows = await prisma.vehicle.groupBy({
    by: ["modelId"],
    where: scopeWhere(s),
    _count: { _all: true },
    orderBy: { _count: { modelId: "desc" } },
    take,
  });
  const models = await prisma.vehicleModel.findMany({
    where: { id: { in: rows.map((r) => r.modelId) } },
    select: { id: true, name: true, manufacturer: { select: { name: true } } },
  });
  const map = new Map(models.map((m) => [m.id, `${m.manufacturer.name} ${m.name}`]));
  return rows.map((r) => ({ key: r.modelId, label: map.get(r.modelId) ?? "Unknown", value: r._count._all }));
}

export async function topAreas(s: Scope = {}, take = 12) {
  const rows = await prisma.vehicle.groupBy({
    by: ["areaId"],
    where: { ...scopeWhere(s), areaId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { areaId: "desc" } },
    take,
  });
  const areas = await prisma.area.findMany({
    where: { id: { in: rows.map((r) => r.areaId!) } },
    select: { id: true, name: true, district: true },
  });
  const map = new Map(areas.map((a) => [a.id, a]));
  return rows.map((r) => {
    const a = map.get(r.areaId!);
    return {
      key: r.areaId!,
      label: a?.name ?? "Unknown",
      district: a ? DISTRICT_LABELS[a.district] : "",
      value: r._count._all,
    };
  });
}

export async function manufacturingYearDistribution(s: Scope = {}): Promise<Datum[]> {
  const rows = await prisma.vehicle.groupBy({
    by: ["manufacturingYear"],
    where: { ...scopeWhere(s), manufacturingYear: { not: null } },
    _count: { _all: true },
    orderBy: { manufacturingYear: "asc" },
  });
  return rows.map((r) => ({ key: String(r.manufacturingYear), label: String(r.manufacturingYear), value: r._count._all }));
}

export async function registrationYearTrend(s: Scope = {}): Promise<Datum[]> {
  const rows = await prisma.vehicle.groupBy({
    by: ["registrationYear"],
    where: { ...scopeWhere(s), registrationYear: { not: null } },
    _count: { _all: true },
    orderBy: { registrationYear: "asc" },
  });
  return rows.map((r) => ({ key: String(r.registrationYear), label: String(r.registrationYear), value: r._count._all }));
}

/** Monthly registrations — only records with an exact registration date are counted. */
export async function registrationMonthlyTrend(s: Scope = {}, months = 24): Promise<Datum[]> {
  const rows = await prisma.$queryRaw<{ m: Date; n: bigint }[]>`
    SELECT date_trunc('month', "registrationDate") AS m, COUNT(*) AS n
    FROM "Vehicle"
    WHERE "registrationDate" IS NOT NULL
      AND "registrationDate" >= (date_trunc('month', CURRENT_DATE) - (${months - 1} * INTERVAL '1 month'))
      AND ${scopeSql(s)}
    GROUP BY 1 ORDER BY 1`;
  return fillMonths(rows, months);
}

/** Records added to the platform per month, plus cumulative size. */
export async function databaseGrowth(months = 12) {
  const [rows, before] = await Promise.all([
    prisma.$queryRaw<{ m: Date; n: bigint }[]>`
      SELECT date_trunc('month', "createdAt") AS m, COUNT(*) AS n
      FROM "Vehicle"
      WHERE "createdAt" >= (date_trunc('month', CURRENT_DATE) - (${months - 1} * INTERVAL '1 month'))
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) AS n FROM "Vehicle"
      WHERE "createdAt" < (date_trunc('month', CURRENT_DATE) - (${months - 1} * INTERVAL '1 month'))`,
  ]);
  let running = Number(before[0]?.n ?? 0);
  return fillMonths(rows, months).map((d) => {
    running += d.value;
    return { ...d, added: d.value, total: running };
  });
}

function fillMonths(rows: { m: Date; n: bigint }[], months: number): Datum[] {
  const map = new Map(rows.map((r) => [new Date(r.m).toISOString().slice(0, 7), Number(r.n)]));
  const out: Datum[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    out.push({
      key,
      label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }),
      value: map.get(key) ?? 0,
    });
  }
  return out;
}

const ENGINE_BUCKETS = [
  { key: "lt125", label: "≤ 125 cc", max: 125 },
  { key: "126-660", label: "126–660 cc", max: 660 },
  { key: "661-1000", label: "661–1000 cc", max: 1000 },
  { key: "1001-1300", label: "1001–1300 cc", max: 1300 },
  { key: "1301-1800", label: "1301–1800 cc", max: 1800 },
  { key: "1801-2500", label: "1801–2500 cc", max: 2500 },
  { key: "2501-4000", label: "2501–4000 cc", max: 4000 },
  { key: "gt4000", label: "> 4000 cc", max: Infinity },
];

export async function engineCapacityDistribution(s: Scope = {}): Promise<Datum[]> {
  const rows = await prisma.$queryRaw<{ b: number; n: bigint }[]>`
    SELECT CASE
      WHEN "engineCapacityCc" <= 125 THEN 0
      WHEN "engineCapacityCc" <= 660 THEN 1
      WHEN "engineCapacityCc" <= 1000 THEN 2
      WHEN "engineCapacityCc" <= 1300 THEN 3
      WHEN "engineCapacityCc" <= 1800 THEN 4
      WHEN "engineCapacityCc" <= 2500 THEN 5
      WHEN "engineCapacityCc" <= 4000 THEN 6
      ELSE 7 END AS b,
      COUNT(*) AS n
    FROM "Vehicle"
    WHERE "engineCapacityCc" IS NOT NULL AND ${scopeSql(s)}
    GROUP BY 1 ORDER BY 1`;
  const map = new Map(rows.map((r) => [Number(r.b), Number(r.n)]));
  return ENGINE_BUCKETS.map((b, i) => ({ key: b.key, label: b.label, value: map.get(i) ?? 0 }));
}

export async function engineStats(s: Scope = {}) {
  const a = await prisma.vehicle.aggregate({
    where: { ...scopeWhere(s), engineCapacityCc: { not: null } },
    _avg: { engineCapacityCc: true },
    _min: { engineCapacityCc: true },
    _max: { engineCapacityCc: true },
    _count: { engineCapacityCc: true },
  });
  return {
    avg: a._avg.engineCapacityCc ? Math.round(a._avg.engineCapacityCc) : null,
    min: a._min.engineCapacityCc,
    max: a._max.engineCapacityCc,
    count: a._count.engineCapacityCc,
  };
}

const AGE_BUCKETS = ["0–2 yrs", "3–5 yrs", "6–10 yrs", "11–15 yrs", "16–20 yrs", "21–30 yrs", "30+ yrs"];

/** Vehicle age derived from manufacturing year (current year − manufacturing year). */
export async function ageDistribution(s: Scope = {}) {
  const year = new Date().getFullYear();
  const rows = await prisma.$queryRaw<{ b: number; n: bigint }[]>`
    SELECT CASE
      WHEN ${year} - "manufacturingYear" <= 2 THEN 0
      WHEN ${year} - "manufacturingYear" <= 5 THEN 1
      WHEN ${year} - "manufacturingYear" <= 10 THEN 2
      WHEN ${year} - "manufacturingYear" <= 15 THEN 3
      WHEN ${year} - "manufacturingYear" <= 20 THEN 4
      WHEN ${year} - "manufacturingYear" <= 30 THEN 5
      ELSE 6 END AS b,
      COUNT(*) AS n
    FROM "Vehicle"
    WHERE "manufacturingYear" IS NOT NULL AND ${scopeSql(s)}
    GROUP BY 1 ORDER BY 1`;
  const avg = await prisma.vehicle.aggregate({
    where: { ...scopeWhere(s), manufacturingYear: { not: null } },
    _avg: { manufacturingYear: true },
  });
  const map = new Map(rows.map((r) => [Number(r.b), Number(r.n)]));
  return {
    buckets: AGE_BUCKETS.map((label, i) => ({ key: String(i), label, value: map.get(i) ?? 0 })),
    averageAge: avg._avg.manufacturingYear ? +(year - avg._avg.manufacturingYear).toFixed(1) : null,
  };
}

/** Car vs motorcycle comparison overall and by district. */
export async function carVsMotorcycle() {
  const rows = await prisma.vehicle.groupBy({
    by: ["district", "category"],
    where: { category: { in: ["CAR", "SUV", "MOTORCYCLE"] } },
    _count: { _all: true },
  });
  const byDistrict = [...DISTRICTS, null].map((d) => {
    const cars = rows.filter((r) => r.district === d && (r.category === "CAR" || r.category === "SUV")).reduce((a, r) => a + r._count._all, 0);
    const motorcycles = rows.filter((r) => r.district === d && r.category === "MOTORCYCLE").reduce((a, r) => a + r._count._all, 0);
    return { key: d ?? "__null", label: d ? DISTRICT_LABELS[d] : "Not recorded", cars, motorcycles };
  }).filter((r) => r.cars + r.motorcycles > 0);
  const cars = byDistrict.reduce((a, r) => a + r.cars, 0);
  const motorcycles = byDistrict.reduce((a, r) => a + r.motorcycles, 0);
  return { cars, motorcycles, byDistrict };
}

export async function commercialStats() {
  const where: Prisma.VehicleWhereInput = { category: { in: COMMERCIAL_CATEGORIES } };
  const [byCategory, byFuel, byDistrict, total] = await Promise.all([
    categoryDistribution({}).then((d) => d.filter((x) => COMMERCIAL_CATEGORIES.includes(x.key as VehicleCategory))),
    prisma.vehicle.groupBy({ by: ["fuelType"], where, _count: { _all: true } }),
    prisma.vehicle.groupBy({ by: ["district"], where, _count: { _all: true } }),
    prisma.vehicle.count({ where }),
  ]);
  return {
    total,
    byCategory,
    byFuel: labelled(byFuel.map((r) => ({ key: r.fuelType, value: r._count._all })), FUEL_LABELS),
    byDistrict: labelled(byDistrict.map((r) => ({ key: r.district, value: r._count._all })), DISTRICT_LABELS, "Not recorded"),
  };
}

/** Field completeness — how much of the database each analysis is based on. */
export async function dataCompleteness(s: Scope = {}) {
  const w = scopeWhere(s);
  const notNull = (field: keyof Prisma.VehicleWhereInput) =>
    prisma.vehicle.count({ where: { ...w, [field]: { not: null } } });
  const [total, mfgYear, regYear, regDate, cc, fuel, transmission, color, district, area] = await Promise.all([
    prisma.vehicle.count({ where: w }),
    notNull("manufacturingYear"),
    notNull("registrationYear"),
    notNull("registrationDate"),
    notNull("engineCapacityCc"),
    notNull("fuelType"),
    notNull("transmission"),
    notNull("color"),
    notNull("district"),
    notNull("areaId"),
  ]);
  return {
    total,
    fields: [
      { label: "Manufacturing year", value: mfgYear },
      { label: "Registration year", value: regYear },
      { label: "Registration date", value: regDate },
      { label: "Engine capacity", value: cc },
      { label: "Fuel type", value: fuel },
      { label: "Transmission", value: transmission },
      { label: "Color", value: color },
      { label: "District", value: district },
      { label: "Area", value: area },
    ],
  };
}

export async function colorDistribution(s: Scope = {}, take = 10): Promise<Datum[]> {
  const rows = await prisma.vehicle.groupBy({
    by: ["color"],
    where: { ...scopeWhere(s), color: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { color: "desc" } },
    take,
  });
  return rows.map((r) => ({ key: r.color!, label: r.color!, value: r._count._all }));
}

/** District × category matrix for location intelligence. */
export async function districtCategoryMatrix() {
  const rows = await prisma.vehicle.groupBy({
    by: ["district", "category"],
    where: { district: { not: null } },
    _count: { _all: true },
  });
  return DISTRICTS.map((d) => {
    const entry: Record<string, number | string> = { key: d, label: DISTRICT_LABELS[d] };
    let total = 0;
    for (const r of rows.filter((x) => x.district === d)) {
      entry[r.category] = r._count._all;
      total += r._count._all;
    }
    entry.total = total;
    return entry as { key: District; label: string; total: number } & Partial<Record<VehicleCategory, number>>;
  });
}
