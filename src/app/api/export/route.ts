import { NextResponse, type NextRequest } from "next/server";
import { assertPermission, AuthError } from "@/lib/auth/session";
import { parseFilters } from "@/lib/vehicle-query";
import { audit } from "@/lib/audit";
import { describeFilters, fetchExportRows, MAX_EXPORT_ROWS, MAX_PDF_ROWS, toCsv, toPdf, toXlsx } from "@/server/export";
import { formatNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const user = await assertPermission("vehicle:export");
    const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
    // preserve multi-value params (category=CAR&category=SUV)
    for (const k of ["category", "fuel", "district"]) {
      const all = req.nextUrl.searchParams.getAll(k);
      if (all.length > 1) (sp as Record<string, string>)[k] = all.join(",");
    }
    const format = sp.format === "xlsx" || sp.format === "pdf" ? sp.format : "csv";
    const filters = parseFilters(sp);
    const limit = format === "pdf" ? MAX_PDF_ROWS : MAX_EXPORT_ROWS;
    const { total, rows } = await fetchExportRows(filters, limit);
    const filterSummary = describeFilters(filters);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const base = `ska-vi-vehicles-${stamp}`;

    await audit({
      user,
      action: "EXPORT",
      entityType: "Vehicle",
      summary: `Exported ${rows.length} of ${total} records as ${format.toUpperCase()}`,
      details: { format, filters: filterSummary || "none", rows: rows.length, total },
    });

    const headers = (type: string, ext: string) => ({
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${base}.${ext}"`,
      "Cache-Control": "no-store",
      "X-Total-Records": String(total),
    });

    if (format === "csv") return new NextResponse(toCsv(rows), { headers: headers("text/csv; charset=utf-8", "csv") });
    if (format === "xlsx") {
      const buf = await toXlsx(rows, { generatedBy: `${user.name} <${user.email}>`, filterSummary, total });
      return new NextResponse(new Uint8Array(buf), { headers: headers("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx") });
    }
    const counts = (k: string) => rows.filter((r) => r.category === k).length;
    const pdf = await toPdf(rows, {
      generatedBy: user.name,
      filterSummary,
      total,
      summary: [
        { label: "Matching records", value: formatNumber(total) },
        { label: "Rows in report", value: formatNumber(rows.length) },
        { label: "Cars (in report)", value: formatNumber(counts("Car")) },
        { label: "Motorcycles (in report)", value: formatNumber(counts("Motorcycle")) },
        { label: "Distinct makes (in report)", value: formatNumber(new Set(rows.map((r) => r.manufacturer)).size) },
      ],
    });
    return new NextResponse(new Uint8Array(pdf), { headers: headers("application/pdf", "pdf") });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[export]", e);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
