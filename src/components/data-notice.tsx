import { AlertTriangle, Info } from "lucide-react";
import { formatNumber } from "@/lib/utils";

/** Warns whenever clearly-labelled synthetic demo records are present. */
export function SyntheticNotice({ count, total }: { count: number; total: number }) {
  if (!count) return null;
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <span className="font-semibold">Synthetic demo data present.</span>{" "}
        {formatNumber(count)} of {formatNumber(total)} records are generated test data (data source &ldquo;SYNTHETIC DEMO DATA&rdquo;),
        not real Karachi vehicles. Figures below must not be cited as actual statistics. A Super Admin can purge them from
        Import &amp; History.
      </div>
    </div>
  );
}

export function BasisNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-subtle">
      <Info className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
