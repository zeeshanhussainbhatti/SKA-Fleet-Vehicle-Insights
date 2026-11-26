"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber, formatPercent } from "@/lib/utils";

export const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
];

type Datum = { key: string; label: string; value: number };

const axis = { fontSize: 11.5, fill: "var(--muted)" };
const tooltipStyle = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    boxShadow: "var(--shadow-pop)",
    fontSize: 12.5,
    color: "var(--foreground)",
    padding: "8px 12px",
  },
  labelStyle: { color: "var(--muted)", marginBottom: 2, fontWeight: 500 },
  itemStyle: { color: "var(--foreground)", padding: 0 },
  cursor: { fill: "var(--surface-2)", opacity: 0.7 },
};

const numberFmt = (v: unknown) => formatNumber(Number(v));
const compact = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v));

export function ColumnChart({
  data,
  height = 260,
  color = "var(--chart-1)",
  name = "Vehicles",
  angled = false,
}: {
  data: Datum[];
  height?: number;
  color?: string;
  name?: string;
  angled?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: angled ? 28 : 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="label"
          tick={axis}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          interval="preserveStartEnd"
          angle={angled ? -40 : 0}
          textAnchor={angled ? "end" : "middle"}
          minTickGap={4}
        />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} allowDecimals={false} width={48} />
        <Tooltip {...tooltipStyle} formatter={numberFmt} />
        <Bar dataKey="value" name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RankedBars({ data, total, color = "var(--chart-1)" }: { data: Datum[]; total?: number; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ol className="space-y-3">
      {data.map((d, i) => (
        <li key={d.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="tabular w-5 shrink-0 text-right text-xs text-subtle">{i + 1}</span>
              <span className="truncate font-medium text-foreground">{d.label}</span>
            </span>
            <span className="tabular shrink-0 text-muted">
              {formatNumber(d.value)}
              {total ? <span className="ml-1.5 text-xs text-subtle">{formatPercent(d.value, total)}</span> : null}
            </span>
          </div>
          <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function DonutChart({ data, height = 220, centerLabel = "Total", horizontal = false }: { data: Datum[]; height?: number; centerLabel?: string; horizontal?: boolean }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className={horizontal ? "flex flex-col items-center gap-5 sm:flex-row" : "flex flex-col items-center gap-5"}>
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip {...tooltipStyle} formatter={numberFmt} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="64%"
              outerRadius="100%"
              paddingAngle={data.length > 1 ? 1.5 : 0}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={d.key} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="tabular text-xl font-semibold tracking-tight">{formatNumber(total)}</div>
          <div className="text-[11px] text-muted">{centerLabel}</div>
        </div>
      </div>
      <ul className={horizontal ? "w-full min-w-0 space-y-2" : "grid w-full min-w-0 grid-cols-2 gap-x-5 gap-y-2"}>
        {data.map((d, i) => (
          <li key={d.key} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="truncate text-foreground">{d.label}</span>
            </span>
            <span className="tabular shrink-0 text-muted">
              {formatNumber(d.value)} <span className="ml-1 text-xs text-subtle">{formatPercent(d.value, total)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendArea({ data, height = 260, name = "Registrations" }: { data: Datum[]; height?: number; name?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={12} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} allowDecimals={false} width={48} />
        <Tooltip {...tooltipStyle} formatter={numberFmt} cursor={{ stroke: "var(--border-strong)" }} />
        <Area type="monotone" dataKey="value" name={name} stroke="var(--chart-1)" strokeWidth={2} fill="url(#trend-fill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GrowthChart({ data, height = 260 }: { data: (Datum & { added: number; total: number })[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={8} />
        <YAxis yAxisId="l" tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} allowDecimals={false} width={48} />
        <YAxis yAxisId="r" orientation="right" tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} allowDecimals={false} width={48} />
        <Tooltip {...tooltipStyle} formatter={numberFmt} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
        <Bar yAxisId="l" dataKey="added" name="Records added" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Line yAxisId="r" type="monotone" dataKey="total" name="Database size" stroke="var(--chart-1)" strokeWidth={2.2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function GroupedBars({
  data,
  series,
  height = 280,
  stacked = false,
}: {
  data: Record<string, string | number>[];
  series: { key: string; name: string; color: string }[];
  height?: number;
  stacked?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval={0} minTickGap={0} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} allowDecimals={false} width={48} />
        <Tooltip {...tooltipStyle} formatter={numberFmt} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            stackId={stacked ? "s" : undefined}
            radius={stacked ? (i === series.length - 1 ? [4, 4, 0, 0] : 0) : [4, 4, 0, 0]}
            maxBarSize={36}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
