import type { Metadata } from "next";
import Link from "next/link";
import { Bike, Building2, Car, CircleGauge, Database, Factory, Layers, Truck, Upload } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import {
  categoryDistribution,
  databaseGrowth,
  districtDistribution,
  getKpis,
  manufacturingYearDistribution,
  registrationYearTrend,
  topManufacturers,
} from "@/server/analytics";
import { PageHeader, EmptyState } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { ColumnChart, DonutChart, GrowthChart, RankedBars, TrendArea } from "@/components/charts/charts";
import { BasisNote, SyntheticNotice } from "@/components/data-notice";
import { BRAND, CATEGORY_LABELS, DISTRICT_LABELS } from "@/lib/constants";
import { formatDateTime, formatNumber, formatVehicleId } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requirePermission("dashboard:view");
  const { denied } = await searchParams;
  const kpis = await getKpis();

  const header = (
    <PageHeader
      eyebrow={BRAND.description}
      title="Intelligence Dashboard"
      description={
        kpis.lastAddedAt
          ? `Live figures computed from ${formatNumber(kpis.total)} records in the database · last record added ${formatDateTime(kpis.lastAddedAt)}`
          : "Live figures computed from records in the SKA-VI database."
      }
      actions={
        <>
          <Button variant="secondary" asChild>
            <Link href="/analytics">Open analytics</Link>
          </Button>
          {can(user.role, "data:import") && (
            <Button asChild>
              <Link href="/data/import">
                <Upload /> Import data
              </Link>
            </Button>
          )}
        </>
      }
    />
  );

  const deniedBanner = denied ? (
    <div className="mb-6 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
      You don&apos;t have permission to open that page. Contact an administrator if you need access.
    </div>
  ) : null;

  if (kpis.total === 0) {
    return (
      <>
        {header}
        {deniedBanner}
        <Card>
          <EmptyState
            icon={<Database />}
            title="The vehicle database is empty"
            description="No statistics are shown until real records exist. Import a CSV or Excel file, or add records manually — every chart on this platform is computed from actual stored data."
            action={
              can(user.role, "data:import") ? (
                <div className="flex gap-2">
                  <Button asChild>
                    <Link href="/data/import">
                      <Upload /> Import records
                    </Link>
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link href="/vehicles/new">Add a vehicle</Link>
                  </Button>
                </div>
              ) : undefined
            }
          />
        </Card>
      </>
    );
  }

  const [categories, manufacturers, years, districts, regTrend, growth, recent] = await Promise.all([
    categoryDistribution(),
    topManufacturers({}, 8),
    manufacturingYearDistribution(),
    districtDistribution(),
    registrationYearTrend(),
    databaseGrowth(12),
    prisma.vehicle.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { manufacturer: { select: { name: true } }, model: { select: { name: true } }, area: { select: { name: true } } },
    }),
  ]);

  const yearsWithData = years.reduce((a, d) => a + d.value, 0);
  const regWithData = regTrend.reduce((a, d) => a + d.value, 0);
  const recentYears = years.slice(-30);

  return (
    <>
      {header}
      {deniedBanner}
      <SyntheticNotice count={kpis.synthetic} total={kpis.total} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard accent label="Total vehicles in database" value={kpis.total} icon={<Database />} sub={`+${formatNumber(kpis.last30)} added in the last 30 days`} />
        <KpiCard label="Cars" value={kpis.cars} icon={<Car />} sub={`plus ${formatNumber(kpis.suvs)} SUVs`} />
        <KpiCard label="Motorcycles" value={kpis.motorcycles} icon={<Bike />} sub={`${formatNumber(kpis.rickshaws)} rickshaws recorded`} />
        <KpiCard label="Commercial vehicles" value={kpis.commercial} icon={<Truck />} sub="Trucks, buses, vans & commercial" />
        <KpiCard label="Manufacturers" value={kpis.manufacturers} icon={<Factory />} sub="Distinct makes with records" />
        <KpiCard label="Vehicle models" value={kpis.models} icon={<Layers />} sub="Distinct models with records" />
        <KpiCard label="Added last 30 days" value={kpis.last30} icon={<CircleGauge />} sub="Records created on the platform" />
        <KpiCard label="Districts covered" value={districts.filter((d) => d.key !== "__null").length} icon={<Building2 />} sub="of 7 Karachi districts" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Database growth" description="Records added per month and cumulative database size (last 12 months)" />
          <CardBody>
            <GrowthChart data={growth} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Vehicle category distribution" description="Share of all records by category" />
          <CardBody>
            <DonutChart data={categories} height={180} centerLabel="vehicles" />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Manufacturer distribution"
            description="Top manufacturers by record count"
            action={<Link className="text-[13px] font-medium text-primary hover:underline" href="/analytics#brands">View all</Link>}
          />
          <CardBody>
            <RankedBars data={manufacturers} total={kpis.total} />
          </CardBody>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Model year distribution" description="Records by manufacturing year" />
          <CardBody>
            {yearsWithData ? (
              <>
                <ColumnChart data={recentYears} angled={recentYears.length > 16} />
                <BasisNote>
                  Based on {formatNumber(yearsWithData)} of {formatNumber(kpis.total)} records that include a manufacturing year
                  {years.length > recentYears.length ? "; showing the most recent 30 model years" : ""}.
                </BasisNote>
              </>
            ) : (
              <EmptyState title="No manufacturing years recorded" description="Add manufacturing years to records to enable this view." />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Area-wise distribution"
            description="Records by registration district"
            action={<Link className="text-[13px] font-medium text-primary hover:underline" href="/locations">Location intelligence</Link>}
          />
          <CardBody>
            <RankedBars data={districts} total={kpis.total} color="var(--chart-3)" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Registration trends" description="Records by registration year" />
          <CardBody>
            {regWithData ? (
              <>
                <TrendArea data={regTrend} height={240} />
                <BasisNote>Based on {formatNumber(regWithData)} records with a registration year.</BasisNote>
              </>
            ) : (
              <EmptyState title="No registration years recorded" description="Registration trends appear once records include a registration year or date." />
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recently added records"
          description="The latest vehicles entered into the database"
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/vehicles?sort=createdAt&dir=desc">Open database</Link>
            </Button>
          }
        />
        <Table>
          <THead>
            <tr>
              <TH>Vehicle ID</TH>
              <TH>Registration</TH>
              <TH>Vehicle</TH>
              <TH>Category</TH>
              <TH>District / Area</TH>
              <TH>Source</TH>
              <TH>Added</TH>
            </tr>
          </THead>
          <tbody>
            {recent.map((v) => (
              <TR key={v.id}>
                <TD className="font-mono text-xs text-muted">
                  <Link href={`/vehicles/${v.id}`} className="hover:text-primary">{formatVehicleId(v.vehicleNo)}</Link>
                </TD>
                <TD>
                  <Link href={`/vehicles/${v.id}`} className="font-mono text-[13px] font-semibold text-foreground hover:text-primary">
                    {v.registrationNumber}
                  </Link>
                </TD>
                <TD>
                  <span className="font-medium">{v.manufacturer.name} {v.model.name}</span>
                  {v.manufacturingYear && <span className="ml-1.5 text-muted">{v.manufacturingYear}</span>}
                </TD>
                <TD><Badge tone="primary">{CATEGORY_LABELS[v.category]}</Badge></TD>
                <TD className="text-muted">
                  {v.district ? DISTRICT_LABELS[v.district] : "—"}
                  {v.area && <span className="text-subtle"> · {v.area.name}</span>}
                </TD>
                <TD className="max-w-48 truncate text-muted">{v.dataSource}</TD>
                <TD className="text-muted">{formatDateTime(v.createdAt)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
