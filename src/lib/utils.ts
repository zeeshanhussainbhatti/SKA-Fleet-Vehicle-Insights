import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nf = new Intl.NumberFormat("en-PK");
export function formatNumber(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return nf.format(n);
}

export function formatPercent(part: number, total: number, digits = 1) {
  if (!total) return "0%";
  return `${((part / total) * 100).toFixed(digits)}%`;
}

export function formatVehicleId(vehicleNo: number) {
  return `SKA-${String(vehicleNo).padStart(7, "0")}`;
}

const dtf = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Karachi",
});
const dttf = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});
export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return dtf.format(new Date(d));
}
export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return dttf.format(new Date(d));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/[_\s]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
