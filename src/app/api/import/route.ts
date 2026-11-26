import { NextResponse, type NextRequest } from "next/server";
import { assertPermission, AuthError } from "@/lib/auth/session";
import { MAX_IMPORT_BYTES, runImport } from "@/server/import";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const user = await assertPermission("data:import");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a CSV or Excel (.xlsx) file to upload." }, { status: 400 });
    if (file.size > MAX_IMPORT_BYTES) return NextResponse.json({ error: `File is larger than ${MAX_IMPORT_BYTES / 1024 / 1024} MB. Split it into smaller files.` }, { status: 413 });
    const name = file.name || "upload.csv";
    if (!/\.(csv|xlsx|txt)$/i.test(name)) return NextResponse.json({ error: "Unsupported file type. Upload .csv or .xlsx." }, { status: 400 });

    const strategy = form.get("duplicateStrategy") === "UPDATE" ? "UPDATE" : "SKIP";
    const dryRun = form.get("dryRun") === "on" || form.get("dryRun") === "true";
    const dataSource = String(form.get("dataSource") ?? "").trim().slice(0, 120) || `Import: ${name}`;

    const batch = await runImport({ buffer: Buffer.from(await file.arrayBuffer()), fileName: name, strategy, dryRun, dataSource, user });
    return NextResponse.json({ batch });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[import]", e);
    return NextResponse.json({ error: "Import failed unexpectedly." }, { status: 500 });
  }
}
