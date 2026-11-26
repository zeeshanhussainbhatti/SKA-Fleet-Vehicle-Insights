import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { assertPermission, AuthError } from "@/lib/auth/session";
import { TEMPLATE_HEADERS } from "@/server/export";
import { CATEGORY_LABELS, DISTRICT_LABELS, FUEL_LABELS, STATUS_LABELS, TRANSMISSION_LABELS } from "@/lib/constants";

/** Blank import templates (headers only — no sample data). */
export async function GET(req: NextRequest) {
  try {
    await assertPermission("data:import");
    if (req.nextUrl.searchParams.get("format") === "xlsx") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Vehicles", { views: [{ state: "frozen", ySplit: 1 }] });
      ws.columns = TEMPLATE_HEADERS.map((h) => ({ header: h, width: Math.max(14, h.length + 2) }));
      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1F4B" } };
      const ref = wb.addWorksheet("Accepted Values");
      ref.columns = [{ header: "Field", width: 24 }, { header: "Accepted values", width: 100 }];
      ref.getRow(1).font = { bold: true };
      ref.addRows([
        ["Vehicle Category", Object.values(CATEGORY_LABELS).join(", ")],
        ["Fuel Type", Object.values(FUEL_LABELS).join(", ")],
        ["Transmission", Object.values(TRANSMISSION_LABELS).join(", ")],
        ["Registration District", Object.values(DISTRICT_LABELS).join(", ")],
        ["Vehicle Status", Object.values(STATUS_LABELS).join(", ")],
        ["Registration Date", "YYYY-MM-DD"],
        ["Required", "Registration Number, Vehicle Category, Manufacturer, Model"],
      ]);
      const buf = await wb.xlsx.writeBuffer();
      return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="ska-vi-import-template.xlsx"',
        },
      });
    }
    return new NextResponse("﻿" + TEMPLATE_HEADERS.join(",") + "\n", {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="ska-vi-import-template.csv"' },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
