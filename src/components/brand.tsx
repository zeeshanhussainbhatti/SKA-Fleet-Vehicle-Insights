import { cn } from "@/lib/utils";

/** SKA-VI mark: a stylised shield/road glyph in brand blue. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden="true">
      <defs>
        <linearGradient id="skavi-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b8cff" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#skavi-g)" />
      <path d="M12 27.5 20 10l8 17.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.2 21.5h9.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".75" />
      <circle cx="20" cy="29.5" r="1.9" fill="#fff" />
    </svg>
  );
}

export function BrandLockup({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      {!compact && (
        <div className="leading-tight">
          <div className={cn("text-[15px] font-semibold tracking-tight", inverted ? "text-white" : "text-foreground")}>
            SKA-VI
          </div>
          <div className={cn("text-[11px]", inverted ? "text-blue-200/70" : "text-muted")}>Vehicle Intelligence</div>
        </div>
      )}
    </div>
  );
}
