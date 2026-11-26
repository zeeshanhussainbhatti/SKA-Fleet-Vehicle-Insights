import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, FileText } from "lucide-react";
import type { District, VehicleCategory } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import {
  ageDistribution,
  carVsMotorcycle,
  categoryDistribution,
  colorDistribution,
  commercialStats,
  dataCompleteness,
  engineCapacityDistribution,
  engineStats,
  fuelDistribution,
  getKpis,
  manufacturingYearDistribution,
  registrationMonthlyTrend,
  registrationYearTrend,
  topManufacturers,
  topModels,
  transmissionDistribution,
  type Scope,
} from "@/server/analytics";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ColumnChart, DonutChart, GroupedBars, RankedBars, TrendArea } from "@/components/charts/charts";
import { BasisNote, SyntheticNotice } from "@/components/data-notice";
import { CATEGORY_LABELS, DISTRICT_LABELS } from "@/lib/constants";
import { formatNumber, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const sum = (d: { value: number }[]) => d.reduce((a, x) => a + x.value, 0);

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 mt-10 flex items-baseline gap-3 border-b border-border pb-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-[13px] text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/60 px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="tabular mt-1 text-xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-subtle">{sub}</div>}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ district?: string; category?: string }> }) {
  const user = await requirePermission("dashboard:view");
  const sp = await searchParams;
  const scope: Scope = {
    district: sp.district && sp.district in DISTRICT_LABELS ? (sp.district as District) : undefined,
    category: sp.category && sp.category in CATEGORY_LABELS ? (sp.category as VehicleCategory) : undefined,
  };
  const kpis = await getKpis();

  const header = (
    <PageHeader
      eyebrow="Vehicle Intelligence"
      title="Analytics"
      description="Every figure is computed live from records in the database. Coverage notes show how many records each analysis is based on."
      actions={
        can(user.role, "vehicle:export") ? (
          <Button variant="secondary" asChild>
            <a href={`/api/reports/summary?${new URLSearchParams(Object.entries(scope).filter(([, v]) => v) as [string, string][])}`}><FileText /> Analytics PDF</a>
          </Button>
        ) : undefined
      }
    />
  );

  if (kpis.total === 0) {
    return (
      <>
        {header}
        <Card><EmptyState icon={<BarChart3 />} title="No data to analyse yet" description="Analytics are generated exclusively from stored records. Import data to populate these reports." /></Card>
      </>
    );
  }

  const [completeness, brands, models, categories, years, regYears, regMonthly, age, fuel, transmission, engine, eStats, colors, cvm, commercial] = await Promise.all([
    dataCompleteness(scope),
    topManufacturers(scope, 15),
    topModels(scope, 15),
    categoryDistribution(scope),
    manufacturingYearDistribution(scope),
    registrationYearTrend(scope),
    registrationMonthlyTrend(scope, 24),
    ageDistribution(scope),
    fuelDistribution(scope),
    transmissionDistribution(scope),
    engineCapacityDistribution(scope),
    engineStats(scope),
    colorDistribution(scope),
    carVsMotorcycle(),
    commercialStats(),
  ]);
  const total = completeness.total;
  const scoped = scope.district || scope.category;

  return (
    <>
      {header}
      <SyntheticNotice count={kpis.synthetic} total={kpis.total} />

      <Card className="sticky top-[72px] z-10 mb-2">
        <form method="get" className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="text-[13px] font-medium text-muted">Scope</span>
          <Select name="district" defaultValue={scope.district ?? ""} className="w-48" aria-label="District">
            <option value="">All districts</option>
            {Object.entries(DISTRICT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          <Select name="category" defaultValue={scope.category ?? ""} className="w-48" aria-label="Category">
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          <Button type="submit" size="sm">Apply</Button>
          {scoped && <Button variant="ghost" size="sm" asChild><Link href="/analytics">Reset</Link></Button>}
          <span className="tabular ml-auto text-[13px] text-muted">
            <b className="text-foreground">{formatNumber(total)}</b> records in scope
          </span>
          <nav className="flex w-full flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2 text-xs font-medium text-muted">
            {[["brands", "Brands & models"], ["fleet", "Fleet mix"], ["age", "Age & year"], ["engine", "Engine & fuel"], ["commercial", "Commercial"], ["trends", "Registration trends"], ["quality", "Data coverage"]].map(([id, l]) => (
              <a key={id} href={`#${id}`} className="hover:text-primary">{l}</a>
            ))}
          </nav>
        </form>
      </Card>

      {total === 0 ? (
        <Card className="mt-6"><EmptyState title="No records in this scope" description="Choose a different district or category." /></Card>
      ) : (
        <>
          <Section id="brands" title="Brands & models" description="Most popular manufacturers and models in Karachi">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card><CardHeader title="Most popular vehicle brands" description="Top 15 manufacturers by record count" /><CardBody><RankedBars data={brands} total={total} /></CardBody></Card>
              <Card><CardHeader title="Most common vehicle models" description="Top 15 models by record count" /><CardBody><RankedBars data={models} total={total} color="var(--chart-5)" /></CardBody></Card>
            </div>
          </Section>

          <Section id="fleet" title="Fleet mix" description="Category composition and car vs motorcycle comparison">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
              <Card><CardHeader title="Vehicle categories" /><CardBody><DonutChart data={categories} centerLabel="vehicles" horizontal /></CardBody></Card>
              <Card>
                <CardHeader title="Car vs motorcycle" description="Cars include SUVs · all districts" />
                <CardBody>
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    <Stat label="Cars & SUVs" value={formatNumber(cvm.cars)} />
                    <Stat label="Motorcycles" value={formatNumber(cvm.motorcycles)} />
                    <Stat label="Motorcycles per car" value={cvm.cars ? (cvm.motorcycles / cvm.cars).toFixed(2) : "—"} />
                  </div>
                  <GroupedBars
                    data={cvm.byDistrict.map((d) => ({ label: d.label.replace("Karachi ", ""), cars: d.cars, motorcycles: d.motorcycles }))}
                    series={[{ key: "cars", name: "Cars & SUVs", color: "var(--chart-1)" }, { key: "motorcycles", name: "Motorcycles", color: "var(--chart-3)" }]}
                    height={240}
                  />
                </CardBody>
              </Card>
            </div>
            <Card className="mt-6"><CardHeader title="Vehicle colors" description="Top 10 recorded colors" /><CardBody><ColumnChart data={colors} height={220} color="var(--chart-2)" /><BasisNote>Based on {formatNumber(sum(colors))} records with a color in the top 10 ({formatPercent(sum(colors), total)} of scope).</BasisNote></CardBody></Card>
          </Section>

          <Section id="age" title="Age & manufacturing year" description="Derived from manufacturing year">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
              <Card>
                <CardHeader title="Vehicle age distribution" description={`Age = ${new Date().getFullYear()} − manufacturing year`} />
                <CardBody>
                  <div className="mb-4"><Stat label="Average vehicle age" value={age.averageAge !== null ? `${age.averageAge} years` : "—"} /></div>
                  <ColumnChart data={age.buckets} height={220} color="var(--chart-4)" />
                  <BasisNote>Based on {formatNumber(sum(age.buckets))} of {formatNumber(total)} records with a manufacturing year.</BasisNote>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Manufacturing year analysis" description="Records per model year" />
                <CardBody>
                  <ColumnChart data={years} height={300} angled={years.length > 18} />
                  <BasisNote>Based on {formatNumber(sum(years))} records. Range {years[0]?.label ?? "—"}–{years.at(-1)?.label ?? "—"}.</BasisNote>
                </CardBody>
              </Card>
            </div>
          </Section>

          <Section id="engine" title="Engine & fuel" description="Engine capacity bands, fuel and transmission mix">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader title="Engine capacity analysis" description="Records by displacement band" />
                <CardBody>
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    <Stat label="Average" value={eStats.avg !== null ? `${formatNumber(eStats.avg)} cc` : "—"} />
                    <Stat label="Smallest" value={eStats.min !== null ? `${formatNumber(eStats.min)} cc` : "—"} />
                    <Stat label="Largest" value={eStats.max !== null ? `${formatNumber(eStats.max)} cc` : "—"} />
                  </div>
                  <ColumnChart data={engine} height={240} color="var(--chart-5)" />
                  <BasisNote>Based on {formatNumber(eStats.count)} of {formatNumber(total)} records with an engine capacity.</BasisNote>
                </CardBody>
              </Card>
              <div className="space-y-6">
                <Card><CardHeader title="Fuel type distribution" /><CardBody><DonutChart data={fuel} height={150} centerLabel="records" /></CardBody></Card>
                <Card><CardHeader title="Transmission" /><CardBody><RankedBars data={transmission} total={total} color="var(--chart-4)" /></CardBody></Card>
              </div>
            </div>
          </Section>

          <Section id="commercial" title="Commercial vehicles" description="Trucks, buses, vans and other commercial vehicles · all districts">
            {commercial.total === 0 ? (
              <Card><EmptyState title="No commercial vehicles recorded" /></Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                <Card><CardHeader title="By type" description={`${formatNumber(commercial.total)} commercial records`} /><CardBody><RankedBars data={commercial.byCategory} total={commercial.total} color="var(--chart-6)" /></CardBody></Card>
                <Card><CardHeader title="By fuel" /><CardBody><RankedBars data={commercial.byFuel} total={commercial.total} color="var(--chart-6)" /></CardBody></Card>
                <Card><CardHeader title="By district" /><CardBody><RankedBars data={commercial.byDistrict} total={commercial.total} color="var(--chart-6)" /></CardBody></Card>
              </div>
            )}
          </Section>

          <Section id="trends" title="Registration trends" description="Monthly and annual registrations">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="Monthly registrations" description="Last 24 months · records with an exact registration date" />
                <CardBody>
                  {sum(regMonthly) ? (
                    <>
                      <TrendArea data={regMonthly} />
                      <BasisNote>Based on {formatNumber(sum(regMonthly))} records registered in this window with a recorded date.</BasisNote>
                    </>
                  ) : (
                    <EmptyState title="No dated registrations in the last 24 months" description="Monthly trends need a Registration Date on records." />
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Annual registrations" description="Records by registration year" />
                <CardBody>
                  {sum(regYears) ? (
                    <>
                      <ColumnChart data={regYears} angled={regYears.length > 18} />
                      <BasisNote>Based on {formatNumber(sum(regYears))} of {formatNumber(total)} records with a registration year.</BasisNote>
                    </>
                  ) : (
                    <EmptyState title="No registration years recorded" />
                  )}
                </CardBody>
              </Card>
            </div>
          </Section>

          <Section id="quality" title="Data coverage" description="How complete each field is — the basis for every analysis above">
            <Card>
              <CardBody className="grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {completeness.fields.map((f) => {
                  const pct = total ? (f.value / total) * 100 : 0;
                  return (
                    <div key={f.label}>
                      <div className="mb-1 flex justify-between text-[13px]">
                        <span className="font-medium">{f.label}</span>
                        <span className="tabular text-muted">{formatNumber(f.value)} · {pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? "var(--success)" : pct >= 40 ? "var(--chart-6)" : "var(--danger)" }} />
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          </Section>
        </>
      )}
    </>
  );
}
