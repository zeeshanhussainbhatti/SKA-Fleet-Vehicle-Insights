/**
 * OPTIONAL: generates clearly-labelled SYNTHETIC records for UI testing.
 *
 * Every record gets data source "SYNTHETIC DEMO DATA — NOT REAL", the
 * dashboard shows a warning banner while any exist, and a Super Admin can
 * purge them in one click. Never use this in production.
 *
 *   npm run seed:synthetic -- 2500
 */
import { PrismaClient, type District, type FuelType, type Transmission, type VehicleCategory } from "@prisma/client";
import { SEED_AREAS, SYNTHETIC_SOURCE } from "../src/lib/constants";

const prisma = new PrismaClient();
const count = Math.min(Number(process.argv[2] ?? 1500) || 1500, 100_000);

let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const weighted = <T,>(items: [T, number][]) => {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of items) if ((r -= w) <= 0) return v;
  return items[0][0];
};

type Spec = { make: string; model: string; cc: number[]; body: string; fuel: FuelType[]; tx: Transmission[] };
const CATALOG: Record<VehicleCategory, Spec[]> = {
  CAR: [
    { make: "Synthetic Motors", model: "Sedan S1", cc: [1300, 1500], body: "Sedan", fuel: ["PETROL", "CNG"], tx: ["MANUAL", "AUTOMATIC"] },
    { make: "Synthetic Motors", model: "Hatch H2", cc: [660, 1000], body: "Hatchback", fuel: ["PETROL"], tx: ["MANUAL", "AMT"] },
    { make: "Demo Auto", model: "City C3", cc: [1200, 1500], body: "Sedan", fuel: ["PETROL", "HYBRID"], tx: ["CVT", "MANUAL"] },
    { make: "Testline", model: "Compact K", cc: [800, 1000], body: "Hatchback", fuel: ["PETROL", "CNG"], tx: ["MANUAL"] },
  ],
  SUV: [
    { make: "Demo Auto", model: "Ranger X", cc: [1800, 2400], body: "SUV", fuel: ["PETROL", "DIESEL"], tx: ["AUTOMATIC"] },
    { make: "Testline", model: "Crossover T", cc: [1500, 2000], body: "Crossover", fuel: ["PETROL", "HYBRID"], tx: ["AUTOMATIC", "CVT"] },
  ],
  MOTORCYCLE: [
    { make: "Sample Cycles", model: "M70", cc: [70], body: "Standard", fuel: ["PETROL"], tx: ["MANUAL"] },
    { make: "Sample Cycles", model: "M125", cc: [125], body: "Standard", fuel: ["PETROL"], tx: ["MANUAL"] },
    { make: "Mockbike", model: "Volt E", cc: [0], body: "Scooter", fuel: ["ELECTRIC"], tx: ["AUTOMATIC"] },
  ],
  RICKSHAW: [{ make: "Mockbike", model: "Auto R3", cc: [200], body: "Standard", fuel: ["CNG", "PETROL", "LPG"], tx: ["MANUAL"] }],
  TRUCK: [{ make: "Heavy Demo", model: "Hauler 10", cc: [6000, 7500], body: "Truck", fuel: ["DIESEL"], tx: ["MANUAL"] }],
  BUS: [{ make: "Heavy Demo", model: "Coach 40", cc: [4200, 6000], body: "Bus", fuel: ["DIESEL", "CNG"], tx: ["MANUAL"] }],
  VAN: [{ make: "Demo Auto", model: "Carry V", cc: [800, 1300], body: "Van", fuel: ["PETROL", "CNG"], tx: ["MANUAL"] }],
  COMMERCIAL: [{ make: "Testline", model: "Loader L", cc: [2500, 2800], body: "Pickup", fuel: ["DIESEL"], tx: ["MANUAL"] }],
  OTHER: [{ make: "Mockbike", model: "Utility U", cc: [150], body: "Loader", fuel: ["PETROL"], tx: ["MANUAL"] }],
};

async function main() {
  const users = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
  const areaRows = await prisma.area.findMany();
  const mfr = new Map<string, string>();
  const mdl = new Map<string, string>();
  for (const specs of Object.values(CATALOG)) {
    for (const s of specs) {
      if (!mfr.has(s.make)) mfr.set(s.make, (await prisma.manufacturer.upsert({ where: { name: s.make }, create: { name: s.make }, update: {} })).id);
      const mid = mfr.get(s.make)!;
      const k = `${s.make}|${s.model}`;
      if (!mdl.has(k)) mdl.set(k, (await prisma.vehicleModel.upsert({ where: { manufacturerId_name: { manufacturerId: mid, name: s.model } }, create: { manufacturerId: mid, name: s.model }, update: {} })).id);
    }
  }
  const districts = Object.keys(SEED_AREAS) as District[];
  const year = new Date().getFullYear();
  const start = (await prisma.vehicle.count({ where: { dataSource: SYNTHETIC_SOURCE } })) + 1;
  const batch = [];
  for (let i = 0; i < count; i++) {
    const category = weighted<VehicleCategory>([["MOTORCYCLE", 52], ["CAR", 26], ["SUV", 5], ["RICKSHAW", 7], ["VAN", 3], ["COMMERCIAL", 3], ["TRUCK", 2], ["BUS", 1], ["OTHER", 1]]);
    const spec = pick(CATALOG[category]);
    const district = pick(districts);
    const areaCandidates = areaRows.filter((a) => a.district === district);
    const mfg = year - Math.floor(Math.pow(rnd(), 1.6) * 28);
    const regYear = Math.min(year, mfg + Math.floor(rnd() * 2));
    const regDate = new Date(Date.UTC(regYear, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27)));
    const created = new Date(Date.now() - Math.floor(Math.pow(rnd(), 0.7) * 330) * 86400000);
    batch.push({
      registrationNumber: `ZZ-DEMO-${String(start + i).padStart(6, "0")}`,
      category,
      manufacturerId: mfr.get(spec.make)!,
      modelId: mdl.get(`${spec.make}|${spec.model}`)!,
      variant: pick(["Std", "GL", "XLi", null]),
      manufacturingYear: mfg,
      registrationYear: regYear,
      registrationDate: regDate > new Date() ? null : regDate,
      engineCapacityCc: pick(spec.cc),
      fuelType: pick(spec.fuel),
      transmission: pick(spec.tx),
      color: pick(["White", "Black", "Silver", "Grey", "Red", "Blue", "Maroon"]),
      bodyType: spec.body,
      district,
      areaId: areaCandidates.length ? pick(areaCandidates).id : null,
      status: weighted([["ACTIVE", 92], ["TRANSFERRED", 4], ["INACTIVE", 3], ["SCRAPPED", 1]] as const),
      dataSource: SYNTHETIC_SOURCE,
      createdAt: created,
      createdById: users?.id,
    });
  }
  for (let i = 0; i < batch.length; i += 1000) {
    await prisma.vehicle.createMany({ data: batch.slice(i, i + 1000) as never, skipDuplicates: true });
  }
  console.log(`✓ Inserted ${count} SYNTHETIC records (data source "${SYNTHETIC_SOURCE}"). These are NOT real vehicles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
