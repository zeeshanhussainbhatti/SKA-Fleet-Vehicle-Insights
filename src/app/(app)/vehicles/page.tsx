import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Plus, Search, SearchX, SlidersHorizontal } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import {
  buildOrderBy,
  buildWhere,
  countActiveFilters,
  filtersToQuery,
  PAGE_SIZES,
  parseFilters,
  vehicleListInclude,
  type SortKey,
  type VehicleFilters,
} from "@/lib/vehicle-query";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import {
  CATEGORY_LABELS,
  COMMON_COLORS,
  DISTRICT_LABELS,
  FUEL_LABELS,
  STATUS_LABELS,
  TRANSMISSION_LABELS,
} from "@/lib/constants";
import { cn, formatNumber, formatVehicleId, formatDate } from "@/lib/utils";
import { statusTone } from "@/lib/ui-helpers";

export const metadata: Metadata = { title: "Vehicle Database" };

function SortHeader({ f, k, label, className }: { f: VehicleFilters; k: SortKey; label: string; className?: string }) {
  const active = f.sort === k;
  const nextDir = active && f.dir === "desc" ? "asc" : "desc";
  const Icon = active ? (f.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TH className={className}>
      <Link href={`/vehicles?${filtersToQuery(f, { sort: k, dir: nextDir, page: 1 })}`} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}>
        {label}
        <Icon className={cn("size-3", !active && "opacity-40")} />
      </Link>
    </TH>
  );
}

function CheckPills({ name, options, selected }: { name: string; options: Record<string, string>; selected: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(options).map(([k, l]) => (
        <label key={k} className="cursor-pointer">
          <input type="checkbox" name={name} value={k} defaultChecked={selected.includes(k)} className="peer sr-only" />
          <span className="inline-flex h-7 items-center rounded-md border border-border-strong bg-surface px-2.5 text-xs font-medium text-muted transition-colors peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
            {l}
          </span>
        </label>
      ))}
    </div>
  );
}

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("vehicle:view");
  const sp = await searchParams;
  const f = parseFilters(sp);
  const where = buildWhere(f);

  const [total, rows, manufacturers] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      orderBy: buildOrderBy(f),
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
      include: vehicleListInclude,
    }),
    prisma.manufacturer.findMany({ select: { name: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);
  const pages = Math.max(1, Math.ceil(total / f.pageSize));
  const activeFilters = countActiveFilters(f);
  const exportQuery = filtersToQuery(f, { page: undefined, pageSize: undefined });
  const advancedOpen =
    !!(f.reg || f.model || f.transmission || f.status || f.color || f.area || f.yearFrom || f.yearTo || f.regYearFrom || f.regYearTo || f.ccMin || f.ccMax || f.source || f.fuel?.length || f.district?.length || f.category?.length);

  return (
    <>
      <PageHeader
        eyebrow="Vehicle Database"
        title="Search & records"
        description="Search across registration numbers, makes and models, then refine with any combination of filters."
        actions={
          <>
            {can(user.role, "vehicle:export") && (
              <>
                <Button variant="secondary" size="sm" asChild>
                  <a href={`/api/export?format=csv&${exportQuery}`}><FileText /> CSV</a>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <a href={`/api/export?format=xlsx&${exportQuery}`}><FileSpreadsheet /> Excel</a>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <a href={`/api/export?format=pdf&${exportQuery}`}><FileText /> PDF</a>
                </Button>
              </>
            )}
            {can(user.role, "vehicle:create") && (
              <Button size="sm" asChild>
                <Link href="/vehicles/new"><Plus /> Add vehicle</Link>
              </Button>
            )}
          </>
        }
      />
      {sp.deleted && (
        <div className="mb-5 rounded-lg border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">Record deleted. A snapshot was saved to the audit log.</div>
      )}

      <Card className="mb-6">
        <form method="get" action="/vehicles">
          <input type="hidden" name="sort" value={f.sort} />
          <input type="hidden" name="dir" value={f.dir} />
          <input type="hidden" name="pageSize" value={f.pageSize} />
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-end">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <Input name="q" defaultValue={f.q} placeholder="Registration number, manufacturer, model or variant…" className="h-10 pl-9" aria-label="Search" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:flex">
              <Select name="manufacturer" defaultValue={f.manufacturer ?? ""} className="h-10 md:w-44" aria-label="Manufacturer">
                <option value="">All manufacturers</option>
                {manufacturers.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
              </Select>
              <Select name="fuel" defaultValue={f.fuel?.length === 1 ? f.fuel[0] : ""} className="h-10 md:w-36" aria-label="Fuel type">
                <option value="">All fuel types</option>
                {Object.entries(FUEL_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            </div>
            <Button type="submit" className="h-10">Search</Button>
          </div>

          <details open={advancedOpen} className="group border-t border-border">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-medium text-muted hover:text-foreground">
              <SlidersHorizontal className="size-4" /> Advanced filters
              {activeFilters > 0 && <Badge tone="primary">{activeFilters} active</Badge>}
              <span className="ml-auto text-xs text-subtle group-open:hidden">Show</span>
              <span className="ml-auto hidden text-xs text-subtle group-open:inline">Hide</span>
            </summary>
            <div className="space-y-5 px-4 pb-5">
              <Field label="Vehicle category">
                <CheckPills name="category" options={CATEGORY_LABELS} selected={f.category ?? []} />
              </Field>
              <Field label="Registration district">
                <CheckPills name="district" options={DISTRICT_LABELS} selected={f.district ?? []} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Registration no. contains" htmlFor="reg"><Input id="reg" name="reg" defaultValue={f.reg} className="font-mono uppercase" /></Field>
                <Field label="Model" htmlFor="model"><Input id="model" name="model" defaultValue={f.model} /></Field>
                <Field label="Registration area" htmlFor="area"><Input id="area" name="area" defaultValue={f.area} placeholder="e.g. Clifton" /></Field>
                <Field label="Color" htmlFor="color">
                  <Input id="color" name="color" list="colors" defaultValue={f.color} />
                  <datalist id="colors">{COMMON_COLORS.map((c) => <option key={c} value={c} />)}</datalist>
                </Field>
                <Field label="Manufacturing year">
                  <div className="flex items-center gap-2">
                    <Input name="yearFrom" type="number" placeholder="From" defaultValue={f.yearFrom} aria-label="Manufacturing year from" />
                    <span className="text-subtle">–</span>
                    <Input name="yearTo" type="number" placeholder="To" defaultValue={f.yearTo} aria-label="Manufacturing year to" />
                  </div>
                </Field>
                <Field label="Registration year">
                  <div className="flex items-center gap-2">
                    <Input name="regYearFrom" type="number" placeholder="From" defaultValue={f.regYearFrom} aria-label="Registration year from" />
                    <span className="text-subtle">–</span>
                    <Input name="regYearTo" type="number" placeholder="To" defaultValue={f.regYearTo} aria-label="Registration year to" />
                  </div>
                </Field>
                <Field label="Engine capacity (CC)">
                  <div className="flex items-center gap-2">
                    <Input name="ccMin" type="number" placeholder="Min" defaultValue={f.ccMin} aria-label="Minimum engine capacity" />
                    <span className="text-subtle">–</span>
                    <Input name="ccMax" type="number" placeholder="Max" defaultValue={f.ccMax} aria-label="Maximum engine capacity" />
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Transmission" htmlFor="transmission">
                    <Select id="transmission" name="transmission" defaultValue={f.transmission ?? ""}>
                      <option value="">Any</option>
                      {Object.entries(TRANSMISSION_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </Select>
                  </Field>
                  <Field label="Status" htmlFor="status">
                    <Select id="status" name="status" defaultValue={f.status ?? ""}>
                      <option value="">Any</option>
                      {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="Data source contains" htmlFor="source"><Input id="source" name="source" defaultValue={f.source} /></Field>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Apply filters</Button>
                <Button variant="ghost" asChild><Link href="/vehicles">Reset all</Link></Button>
              </div>
            </div>
          </details>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="text-sm text-muted">
            <span className="tabular font-semibold text-foreground">{formatNumber(total)}</span> matching record{total === 1 ? "" : "s"}
            {total > 0 && (
              <span className="tabular"> · showing {formatNumber((f.page - 1) * f.pageSize + 1)}–{formatNumber(Math.min(total, f.page * f.pageSize))}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted">
            Rows per page:
            {PAGE_SIZES.map((s) => (
              <Link key={s} href={`/vehicles?${filtersToQuery(f, { pageSize: s, page: 1 })}`} className={cn("rounded px-2 py-1", f.pageSize === s ? "bg-primary-soft font-semibold text-primary" : "hover:bg-surface-2")}>
                {s}
              </Link>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title={activeFilters ? "No records match these filters" : "No vehicle records yet"}
            description={activeFilters ? "Try widening the year range or removing a filter." : "Import a spreadsheet or add records manually to build the database."}
            action={activeFilters ? <Button variant="secondary" asChild><Link href="/vehicles">Clear filters</Link></Button> : undefined}
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <SortHeader f={f} k="vehicleNo" label="Vehicle ID" />
                <SortHeader f={f} k="registrationNumber" label="Registration" />
                <SortHeader f={f} k="manufacturer" label="Manufacturer" />
                <SortHeader f={f} k="model" label="Model" />
                <TH>Category</TH>
                <SortHeader f={f} k="manufacturingYear" label="Mfg." />
                <SortHeader f={f} k="engineCapacityCc" label="CC" className="text-right" />
                <TH>Fuel</TH>
                <TH>Color</TH>
                <TH>District / Area</TH>
                <TH>Status</TH>
                <SortHeader f={f} k="updatedAt" label="Updated" />
              </tr>
            </THead>
            <tbody>
              {rows.map((v) => (
                <TR key={v.id}>
                  <TD className="font-mono text-xs text-muted">{formatVehicleId(v.vehicleNo)}</TD>
                  <TD>
                    <Link href={`/vehicles/${v.id}`} className="font-mono text-[13px] font-semibold text-primary hover:underline">{v.registrationNumber}</Link>
                  </TD>
                  <TD className="font-medium">{v.manufacturer.name}</TD>
                  <TD>
                    {v.model.name}
                    {v.variant && <span className="ml-1 text-muted">{v.variant}</span>}
                  </TD>
                  <TD><Badge tone="primary">{CATEGORY_LABELS[v.category]}</Badge></TD>
                  <TD className="tabular">{v.manufacturingYear ?? "—"}</TD>
                  <TD className="tabular text-right">{v.engineCapacityCc !== null ? formatNumber(v.engineCapacityCc) : "—"}</TD>
                  <TD className="text-muted">{v.fuelType ? FUEL_LABELS[v.fuelType] : "—"}</TD>
                  <TD className="text-muted">{v.color ?? "—"}</TD>
                  <TD className="text-muted">
                    {v.district ? DISTRICT_LABELS[v.district] : "—"}
                    {v.area && <span className="text-subtle"> · {v.area.name}</span>}
                  </TD>
                  <TD><Badge tone={statusTone(v.status)}>{STATUS_LABELS[v.status]}</Badge></TD>
                  <TD className="text-muted">{formatDate(v.updatedAt)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
            <span className="tabular text-muted">Page {formatNumber(f.page)} of {formatNumber(pages)}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" asChild disabled={f.page <= 1}>
                <Link aria-disabled={f.page <= 1} className={cn(f.page <= 1 && "pointer-events-none opacity-50")} href={`/vehicles?${filtersToQuery(f, { page: f.page - 1 })}`}>
                  <ChevronLeft /> Previous
                </Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link aria-disabled={f.page >= pages} className={cn(f.page >= pages && "pointer-events-none opacity-50")} href={`/vehicles?${filtersToQuery(f, { page: f.page + 1 })}`}>
                  Next <ChevronRight />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
