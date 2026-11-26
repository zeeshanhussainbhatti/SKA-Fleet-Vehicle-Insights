import { NextResponse, type NextRequest } from "next/server";
import type { District, VehicleCategory } from "@prisma/client";
import { assertPermission, AuthError } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { CATEGORY_LABELS, DISTRICT_LABELS } from "@/lib/constants";
import { buildSummaryPdf } from "@/server/summary-report";

export async function GET(req: NextRequest) {
  try {
    const user = await assertPermission("vehicle:export");
    const d = req.nextUrl.searchParams.get("district") ?? "";
    const c = req.nextUrl.searchParams.get("category") ?? "";
    const scope = {
      district: d in DISTRICT_LABELS ? (d as District) : undefined,
      category: c in CATEGORY_LABELS ? (c as VehicleCategory) : undefined,
    };
    const pdf = await buildSummaryPdf(scope, user.name);
    await audit({ user, action: "EXPORT", entityType: "Report", summary: "Generated analytics summary PDF", details: { scope } });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ska-vi-analytics-${new Date().toISOString().slice(0, 10)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[summary-report]", e);
    return NextResponse.json({ error: "Report generation failed." }, { status: 500 });
  }
}
