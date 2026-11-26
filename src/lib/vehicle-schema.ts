import { z } from "zod";
import type { District, FuelType, Transmission, VehicleCategory, VehicleStatus } from "@prisma/client";
import {
  CATEGORY_LABELS,
  DISTRICT_LABELS,
  FUEL_LABELS,
  STATUS_LABELS,
  TRANSMISSION_LABELS,
} from "@/lib/constants";

/** Normalise a registration number: upper-case, single dashes, no stray spaces. */
export function normalizeRegistration(input: string) {
  return input
    .toUpperCase()
    .trim()
    .replace(/[\s_./]+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const REGISTRATION_PATTERN = /^[A-Z0-9]{1,8}(-[A-Z0-9]{1,8}){0,3}$/;

function key(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function buildMatcher<T extends string>(labels: Record<T, string>, aliases: Record<string, T> = {}) {
  const map = new Map<string, T>();
  for (const [value, label] of Object.entries(labels) as [T, string][]) {
    map.set(key(value), value);
    map.set(key(label), value);
  }
  for (const [alias, value] of Object.entries(aliases)) map.set(key(alias), value);
  return (raw: string | null | undefined): T | undefined => {
    if (!raw) return undefined;
    return map.get(key(raw));
  };
}

export const matchCategory = buildMatcher<VehicleCategory>(CATEGORY_LABELS, {
  "Motor Cycle": "MOTORCYCLE",
  Bike: "MOTORCYCLE",
  Motorbike: "MOTORCYCLE",
  Scooter: "MOTORCYCLE",
  "Motor Car": "CAR",
  Jeep: "SUV",
  Rickshaws: "RICKSHAW",
  "Auto Rickshaw": "RICKSHAW",
  Qingqi: "RICKSHAW",
  Lorry: "TRUCK",
  Commercial: "COMMERCIAL",
  "Light Commercial Vehicle": "COMMERCIAL",
  LCV: "COMMERCIAL",
  Pickup: "COMMERCIAL",
  Coaster: "BUS",
  Minibus: "BUS",
});

export const matchFuel = buildMatcher<FuelType>(FUEL_LABELS, {
  Gasoline: "PETROL",
  Petrol: "PETROL",
  EV: "ELECTRIC",
  "Petrol/CNG": "CNG",
  "Petrol CNG": "CNG",
});

export const matchTransmission = buildMatcher<Transmission>(TRANSMISSION_LABELS, {
  Auto: "AUTOMATIC",
  AT: "AUTOMATIC",
  MT: "MANUAL",
  Std: "MANUAL",
  Standard: "MANUAL",
});

export const matchStatus = buildMatcher<VehicleStatus>(STATUS_LABELS, { Stolen: "STOLEN" });

export const matchDistrict = buildMatcher<District>(DISTRICT_LABELS, {
  South: "KARACHI_SOUTH",
  "District South": "KARACHI_SOUTH",
  East: "KARACHI_EAST",
  "District East": "KARACHI_EAST",
  West: "KARACHI_WEST",
  "District West": "KARACHI_WEST",
  Central: "KARACHI_CENTRAL",
  "District Central": "KARACHI_CENTRAL",
  "District Korangi": "KORANGI",
  "District Malir": "MALIR",
  "District Keamari": "KEAMARI",
  Kemari: "KEAMARI",
  "District Kemari": "KEAMARI",
});

const currentYear = () => new Date().getFullYear();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalYear = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(String(v).trim());
    if (!Number.isInteger(n) || n < 1900 || n > currentYear() + 1) {
      ctx.addIssue({ code: "custom", message: `must be a year between 1900 and ${currentYear() + 1}` });
      return z.NEVER;
    }
    return n;
  });

function enumField<T extends string>(matcher: (s: string) => T | undefined, label: string, required: boolean) {
  return z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v || !v.trim()) {
        if (required) {
          ctx.addIssue({ code: "custom", message: `${label} is required` });
          return z.NEVER;
        }
        return undefined;
      }
      const m = matcher(v);
      if (!m) {
        ctx.addIssue({ code: "custom", message: `unrecognised ${label.toLowerCase()} "${v}"` });
        return z.NEVER;
      }
      return m;
    });
}

/**
 * Canonical vehicle input schema, shared by the record form and bulk import.
 * Accepts loose strings (as found in CSV/Excel) and produces typed values.
 */
export const vehicleInputSchema = z
  .object({
    registrationNumber: z
      .string({ message: "Registration number is required" })
      .transform(normalizeRegistration)
      .refine((v) => v.length >= 2, "Registration number is required")
      .refine((v) => REGISTRATION_PATTERN.test(v), "Registration number format is invalid"),
    category: enumField(matchCategory, "Category", true),
    manufacturer: z.string({ message: "Manufacturer is required" }).trim().min(1, "Manufacturer is required").max(80),
    model: z.string({ message: "Model is required" }).trim().min(1, "Model is required").max(80),
    variant: optionalText(80),
    manufacturingYear: optionalYear,
    registrationYear: optionalYear,
    registrationDate: z
      .union([z.string(), z.date()])
      .optional()
      .transform((v, ctx) => {
        if (v === undefined || v === "") return undefined;
        const d = v instanceof Date ? v : new Date(String(v).trim());
        if (Number.isNaN(d.getTime()) || d.getFullYear() < 1900 || d > new Date(Date.now() + 86400000)) {
          ctx.addIssue({ code: "custom", message: "invalid registration date (use YYYY-MM-DD)" });
          return z.NEVER;
        }
        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      }),
    engineCapacityCc: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v, ctx) => {
        if (v === undefined || v === "") return undefined;
        const n = typeof v === "number" ? v : Number(String(v).replace(/cc/i, "").replace(/,/g, "").trim());
        if (!Number.isInteger(n) || n < 0 || n > 30000) {
          ctx.addIssue({ code: "custom", message: "engine capacity must be a whole number of CC (0–30000)" });
          return z.NEVER;
        }
        return n;
      }),
    fuelType: enumField(matchFuel, "Fuel type", false),
    transmission: enumField(matchTransmission, "Transmission", false),
    color: optionalText(40).transform((v) => (v ? v.replace(/\b\w/g, (c) => c.toUpperCase()) : v)),
    bodyType: optionalText(40),
    district: enumField(matchDistrict, "District", false),
    area: optionalText(80),
    status: enumField(matchStatus, "Status", false).transform((v) => v ?? "ACTIVE"),
    dataSource: optionalText(120),
  })
  .superRefine((v, ctx) => {
    if (v.manufacturingYear && v.registrationYear && v.registrationYear < v.manufacturingYear - 1) {
      ctx.addIssue({
        code: "custom",
        path: ["registrationYear"],
        message: "registration year cannot be earlier than manufacturing year",
      });
    }
    if (v.registrationDate && v.registrationYear && v.registrationDate.getUTCFullYear() !== v.registrationYear) {
      ctx.addIssue({
        code: "custom",
        path: ["registrationDate"],
        message: "registration date does not match registration year",
      });
    }
    if (v.area && !v.district) {
      ctx.addIssue({ code: "custom", path: ["district"], message: "district is required when an area is given" });
    }
  });

export type VehicleInput = z.output<typeof vehicleInputSchema>;

/** Field metadata for import header mapping (lower-cased, punctuation-free aliases). */
export const IMPORT_FIELDS: { field: keyof z.input<typeof vehicleInputSchema>; header: string; aliases: string[]; required?: boolean }[] = [
  { field: "registrationNumber", header: "Registration Number", aliases: ["registration no", "reg no", "reg number", "registration", "plate", "plate number", "number plate", "regno"], required: true },
  { field: "category", header: "Vehicle Category", aliases: ["category", "type", "vehicle type", "class"], required: true },
  { field: "manufacturer", header: "Manufacturer", aliases: ["make", "brand", "maker", "company"], required: true },
  { field: "model", header: "Model", aliases: ["model name", "vehicle model"], required: true },
  { field: "variant", header: "Variant", aliases: ["trim", "version"] },
  { field: "manufacturingYear", header: "Manufacturing Year", aliases: ["model year", "year of manufacture", "mfg year", "make year", "year"] },
  { field: "registrationYear", header: "Registration Year", aliases: ["reg year", "year of registration"] },
  { field: "registrationDate", header: "Registration Date", aliases: ["reg date", "date of registration"] },
  { field: "engineCapacityCc", header: "Engine Capacity (CC)", aliases: ["engine capacity", "engine cc", "cc", "engine", "displacement", "engine capacity cc"] },
  { field: "fuelType", header: "Fuel Type", aliases: ["fuel"] },
  { field: "transmission", header: "Transmission", aliases: ["gearbox", "gear"] },
  { field: "color", header: "Vehicle Color", aliases: ["color", "colour", "vehicle colour"] },
  { field: "bodyType", header: "Body Type", aliases: ["body", "body style"] },
  { field: "district", header: "Registration District", aliases: ["district"] },
  { field: "area", header: "Registration Area", aliases: ["area", "locality", "town", "location"] },
  { field: "status", header: "Vehicle Status", aliases: ["status"] },
  { field: "dataSource", header: "Data Source", aliases: ["source"] },
];
