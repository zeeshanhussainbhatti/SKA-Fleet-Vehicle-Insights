import { cn, formatNumber } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  icon,
  sub,
  accent = false,
  className,
}: {
  label: string;
  value: number | string | null;
  icon?: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5 shadow-card",
        accent
          ? "border-navy-3 bg-gradient-to-br from-navy-2 to-navy text-white"
          : "border-border bg-surface",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("text-[12.5px] font-medium", accent ? "text-blue-100/80" : "text-muted")}>{label}</div>
        {icon && (
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-lg [&_svg]:size-4",
              accent ? "bg-white/10 text-blue-100" : "bg-primary-soft text-primary",
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div className={cn("tabular mt-2 text-[28px] font-semibold leading-none tracking-tight", accent ? "text-white" : "text-foreground")}>
        {typeof value === "number" ? formatNumber(value) : (value ?? "—")}
      </div>
      {sub && <div className={cn("mt-2 text-xs", accent ? "text-blue-100/70" : "text-subtle")}>{sub}</div>}
      {accent && (
        <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-primary/30 blur-2xl" />
      )}
    </div>
  );
}
