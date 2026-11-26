import "server-only";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import type { DuplicateStrategy, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { IMPORT_FIELDS, vehicleInputSchema, type VehicleInput } from "@/lib/vehicle-schema";
import { ReferenceResolver, toVehicleData } from "@/server/vehicles";
import { audit } from "@/lib/audit";
import type { CurrentUser } from "@/lib/auth/session";

export const MAX_IMPORT_ROWS = 50_000;
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024; // stay under typical serverless body limits
const MAX_STORED_ERRORS = 5_000;

type RawRow = Record<string, string>;

function cellToString(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v && v.result !== undefined) return cellToString(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);
    if ("error" in v) return "";
  }
  return String(v);
}

export async function parseSpreadsheet(buffer: Buffer, fileName: string): Promise<{ headers: string[]; rows: RawRow[] }> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    const text = buffer.toString("utf8").replace(/^﻿/, "");
    const parsed = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
    if (parsed.errors.length && !parsed.data.length) throw new Error(`CSV could not be parsed: ${parsed.errors[0].message}`);
    return { headers: parsed.meta.fields ?? [], rows: parsed.data };
  }
  if (lower.endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error("The workbook has no worksheets.");
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = cellToString(cell.value).trim();
    });
    const rows: RawRow[] = [];
    ws.eachRow({ includeEmpty: false }, (row, idx) => {
      if (idx === 1) return;
      const rec: RawRow = {};
      let any = false;
      headers.forEach((h, i) => {
        if (!h) return;
        const s = cellToString(row.getCell(i + 1).value).trim();
        if (s) any = true;
        rec[h] = s;
      });
      if (any) rows.push(rec);
    });
    return { headers: headers.filter(Boolean), rows };
  }
  throw new Error("Unsupported file type. Upload a .csv or .xlsx file.");
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Map spreadsheet headers to canonical fields using names and aliases. */
export function mapHeaders(headers: string[]) {
  const mapping = new Map<string, (typeof IMPORT_FIELDS)[number]["field"]>();
  const used = new Set<string>();
  for (const f of IMPORT_FIELDS) {
    const candidates = [f.field, f.header, ...f.aliases].map(norm);
    const match = headers.find((h) => !mapping.has(h) && candidates.includes(norm(h)));
    if (match && !used.has(f.field)) {
      mapping.set(match, f.field);
      used.add(f.field);
    }
  }
  const missingRequired = IMPORT_FIELDS.filter((f) => f.required && !used.has(f.field)).map((f) => f.header);
  const unmapped = headers.filter((h) => !mapping.has(h));
  return { mapping, missingRequired, unmapped };
}

type RowError = { rowNumber: number; field?: string; message: string; kind: string; rawData?: RawRow };

export async function runImport(opts: {
  buffer: Buffer;
  fileName: string;
  strategy: DuplicateStrategy;
  dryRun: boolean;
  dataSource: string;
  user: CurrentUser;
}) {
  const { buffer, fileName, strategy, dryRun, dataSource, user } = opts;
  const fileType = fileName.toLowerCase().endsWith(".xlsx") ? "XLSX" : "CSV";

  const batch = await prisma.importBatch.create({
    data: {
      fileName: fileName.slice(0, 200),
      fileType,
      fileSizeBytes: buffer.length,
      duplicateStrategy: strategy,
      dryRun,
      dataSource,
      userId: user.id,
    },
  });

  const fail = async (message: string) => {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: "FAILED", message, completedAt: new Date() },
    });
    await audit({ user, action: dryRun ? "IMPORT_VALIDATE" : "IMPORT", entityType: "ImportBatch", entityId: batch.id, summary: `Import of ${fileName} failed: ${message}` });
    return prisma.importBatch.findUniqueOrThrow({ where: { id: batch.id } });
  };

  let parsed: Awaited<ReturnType<typeof parseSpreadsheet>>;
  try {
    parsed = await parseSpreadsheet(buffer, fileName);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "File could not be read.");
  }
  if (!parsed.rows.length) return fail("The file contains no data rows.");
  if (parsed.rows.length > MAX_IMPORT_ROWS) return fail(`The file has ${parsed.rows.length} rows; the maximum per import is ${MAX_IMPORT_ROWS}.`);

  const { mapping, missingRequired, unmapped } = mapHeaders(parsed.headers);
  if (missingRequired.length) return fail(`Missing required column(s): ${missingRequired.join(", ")}.`);

  const errors: RowError[] = [];
  const valid: { rowNumber: number; data: VehicleInput }[] = [];
  const seen = new Map<string, number>();

  parsed.rows.forEach((raw, i) => {
    const rowNumber = i + 2; // header is row 1
    const input: Record<string, string> = {};
    for (const [header, field] of mapping) input[field] = raw[header] ?? "";
    const result = vehicleInputSchema.safeParse(input);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path.join(".") || undefined;
        errors.push({ rowNumber, field, message: field ? `${field}: ${issue.message}` : issue.message, kind: "VALIDATION", rawData: raw });
      }
      return;
    }
    const reg = result.data.registrationNumber;
    const firstRow = seen.get(reg);
    if (firstRow) {
      errors.push({ rowNumber, field: "registrationNumber", message: `Duplicate of row ${firstRow} in this file (${reg})`, kind: "DUPLICATE_IN_FILE", rawData: raw });
      return;
    }
    seen.set(reg, rowNumber);
    valid.push({ rowNumber, data: result.data });
  });

  // Detect duplicates against existing database records
  const existing = new Map<string, string>();
  const regs = valid.map((v) => v.data.registrationNumber);
  for (let i = 0; i < regs.length; i += 2000) {
    const found = await prisma.vehicle.findMany({
      where: { registrationNumber: { in: regs.slice(i, i + 2000) } },
      select: { id: true, registrationNumber: true },
    });
    for (const f of found) existing.set(f.registrationNumber, f.id);
  }

  const toInsert = valid.filter((v) => !existing.has(v.data.registrationNumber));
  const dupes = valid.filter((v) => existing.has(v.data.registrationNumber));
  const duplicateNotes: RowError[] =
    strategy === "SKIP"
      ? dupes.map((d) => ({ rowNumber: d.rowNumber, field: "registrationNumber", message: `Already in database (${d.data.registrationNumber}) — skipped`, kind: "DUPLICATE_IN_DB" }))
      : [];

  let inserted = 0;
  let updated = 0;

  if (!dryRun) {
    try {
      const resolver = new ReferenceResolver();
      for (let i = 0; i < toInsert.length; i += 500) {
        const chunk = toInsert.slice(i, i + 500);
        const data: Prisma.VehicleCreateManyInput[] = [];
        for (const row of chunk) {
          data.push({ ...(await toVehicleData(row.data, resolver, dataSource)), importBatchId: batch.id, createdById: user.id, updatedById: user.id });
        }
        const res = await prisma.vehicle.createMany({ data, skipDuplicates: true });
        inserted += res.count;
      }
      if (strategy === "UPDATE") {
        for (let i = 0; i < dupes.length; i += 200) {
          const chunk = dupes.slice(i, i + 200);
          const ops = [];
          for (const row of chunk) {
            const d = await toVehicleData(row.data, resolver, dataSource);
            ops.push(prisma.vehicle.update({ where: { id: existing.get(row.data.registrationNumber)! }, data: { ...d, updatedById: user.id } }));
          }
          await prisma.$transaction(ops);
          updated += chunk.length;
        }
      }
    } catch (e) {
      console.error("[import] write failed", e);
      await prisma.importBatch.update({ where: { id: batch.id }, data: { insertedRows: inserted, updatedRows: updated } });
      return fail(`Database write failed after ${inserted} inserted / ${updated} updated rows. ${e instanceof Error ? e.message.slice(0, 300) : ""}`);
    }
  }

  const allIssues = [...errors, ...duplicateNotes];
  if (allIssues.length) {
    await prisma.importError.createMany({
      data: allIssues.slice(0, MAX_STORED_ERRORS).map((e) => ({
        batchId: batch.id,
        rowNumber: e.rowNumber,
        field: e.field,
        message: e.message.slice(0, 500),
        kind: e.kind,
        rawData: e.rawData as Prisma.InputJsonValue | undefined,
      })),
    });
  }

  const errorRows = new Set(errors.map((e) => e.rowNumber)).size;
  const messages: string[] = [];
  if (unmapped.length) messages.push(`Ignored column(s): ${unmapped.join(", ")}.`);
  if (allIssues.length > MAX_STORED_ERRORS) messages.push(`Only the first ${MAX_STORED_ERRORS} issues were stored.`);
  if (dryRun) messages.push(`Validation only — would insert ${toInsert.length} and ${strategy === "UPDATE" ? `update ${dupes.length}` : `skip ${dupes.length} duplicate`} record(s).`);

  const final = await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: dryRun ? "VALIDATED" : errorRows ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      totalRows: parsed.rows.length,
      insertedRows: dryRun ? 0 : inserted,
      updatedRows: dryRun ? 0 : updated,
      duplicateRows: dupes.length + errors.filter((e) => e.kind === "DUPLICATE_IN_FILE").length,
      errorRows,
      message: messages.join(" ") || null,
      completedAt: new Date(),
    },
  });

  await audit({
    user,
    action: dryRun ? "IMPORT_VALIDATE" : "IMPORT",
    entityType: "ImportBatch",
    entityId: batch.id,
    summary: dryRun
      ? `Validated ${fileName}: ${parsed.rows.length} rows, ${errorRows} with errors`
      : `Imported ${fileName}: ${inserted} inserted, ${updated} updated, ${dupes.length} duplicates, ${errorRows} errors`,
    details: { totalRows: parsed.rows.length, inserted, updated, duplicates: dupes.length, errorRows, strategy, dataSource },
  });

  return final;
}
