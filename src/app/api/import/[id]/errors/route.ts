import Papa from "papaparse";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assertPermission, AuthError } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

/** Download the error report for an import batch as CSV. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await assertPermission("data:import");
    const { id } = await ctx.params;
    const batch = await prisma.importBatch.findUnique({ where: { id }, select: { id: true, userId: true, fileName: true } });
    if (!batch || (batch.userId !== user.id && !can(user.role, "data:import-history-all"))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const errors = await prisma.importError.findMany({ where: { batchId: id }, orderBy: [{ rowNumber: "asc" }] });
    const csv = Papa.unparse({
      fields: ["Row", "Type", "Field", "Message", "Original data"],
      data: errors.map((e) => [e.rowNumber, e.kind, e.field ?? "", e.message, e.rawData ? JSON.stringify(e.rawData) : ""]),
    });
    return new NextResponse("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="import-errors-${batch.id}.csv"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
