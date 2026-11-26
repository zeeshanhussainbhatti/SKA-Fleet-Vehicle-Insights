"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, FileSpreadsheet, Loader2, UploadCloud, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { cn, formatBytes, formatNumber } from "@/lib/utils";

type Batch = {
  id: string;
  status: string;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  duplicateRows: number;
  errorRows: number;
  message: string | null;
  dryRun: boolean;
};

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Batch | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return setError("Choose a file first.");
    setBusy(true);
    setError(null);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    fd.set("file", file);
    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Upload failed (${res.status})`);
      setResult(json.batch);
      if (json.batch.status === "FAILED") toast.error("Import failed", { description: json.batch.message });
      else toast.success(json.batch.dryRun ? "Validation complete" : "Import complete");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          drag ? "border-primary bg-primary-soft" : "border-border-strong bg-surface-2/50 hover:border-primary/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <>
            <FileSpreadsheet className="mb-3 size-9 text-primary" />
            <div className="text-sm font-semibold">{file.name}</div>
            <div className="mt-1 text-xs text-muted">{formatBytes(file.size)} · click to choose a different file</div>
          </>
        ) : (
          <>
            <UploadCloud className="mb-3 size-9 text-subtle" />
            <div className="text-sm font-semibold">Drop a CSV or Excel file here, or click to browse</div>
            <div className="mt-1 text-xs text-muted">.csv or .xlsx · up to 4 MB · up to 50,000 rows per file</div>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data source label" htmlFor="dataSource" hint="Stored on every imported record for provenance">
          <Input id="dataSource" name="dataSource" placeholder="e.g. Excise & Taxation Sindh — Nov 2026 extract" />
        </Field>
        <Field label="When a registration number already exists" htmlFor="duplicateStrategy">
          <Select id="duplicateStrategy" name="duplicateStrategy" defaultValue="SKIP">
            <option value="SKIP">Skip the row (keep existing record)</option>
            <option value="UPDATE">Update the existing record</option>
          </Select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="dryRun" className="size-4 accent-[var(--primary)]" />
        Validate only — check the file and report issues without writing anything
      </label>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          <XCircle className="size-4" /> {error}
        </div>
      )}
      {result && (
        <div className={cn("rounded-lg border px-4 py-3 text-sm", result.status === "FAILED" ? "border-danger/25 bg-danger-soft text-danger" : "border-success/25 bg-success-soft text-success")}>
          <div className="flex items-center gap-2 font-semibold">
            {result.status === "FAILED" ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
            {result.status === "FAILED" ? "Import failed" : result.dryRun ? "Validation finished" : "Import finished"}
          </div>
          <div className="tabular mt-1 text-foreground/80">
            {formatNumber(result.totalRows)} rows read · {formatNumber(result.insertedRows)} inserted · {formatNumber(result.updatedRows)} updated · {formatNumber(result.duplicateRows)} duplicates · {formatNumber(result.errorRows)} rows with errors
          </div>
          {result.message && <div className="mt-1 text-foreground/70">{result.message}</div>}
          <Link href={`/data/import/${result.id}`} className="mt-2 inline-block font-medium text-primary hover:underline">View batch report →</Link>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !file}>
          {busy ? <Loader2 className="animate-spin" /> : <UploadCloud />} {busy ? "Processing…" : "Upload & process"}
        </Button>
      </div>
    </form>
  );
}
