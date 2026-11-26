import type { Metadata } from "next";
import Link from "next/link";
import { MapPinned } from "lucide-react";
import type { District } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { districtCategoryMatrix, districtDistribution, getKpis, topAreas } from "@/server/analytics";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { RankedBars } from "@/components/charts/charts";
import { DistrictMap } from "@/components/charts/district-map";
import { BasisNote, SyntheticNotice } from "@/components/data-notice";
import { CATEGORY_LABELS, DISTRICT_CENTROIDS, DISTRICT_LABELS, DISTRICTS } from "@/lib/constants";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Location Intelligence" };

const MATRIX_COLS = ["CAR", "SUV", "MOTORCYCLE", "RICKSHAW", "VAN", "TRUCK", "BUS", "COMMERCIAL", "OTHER"] as const;

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ district?: string }> }) {
  await requirePermission("dashboard:view");
  const sp = await searchParams;
  const selected = sp.district && sp.district in DISTRICT_LABELS ? (sp.district as District) : undefined;
  const kpis = await getKpis();

  const header = (
    <PageHeader
      eyebrow="Karachi Location Intelligence"
      title="Districts & areas"
      description="Geographic segmentation of records across Karachi's seven districts — South, East, West, Central, Korangi, Malir and Keamari."
    />
  );
  if (kpis.total === 0) {
    return (
      <>
        {header}
        <Card><EmptyState icon={<MapPinned />} title="No location data yet" description="District and area analytics appear once records with a registration district are stored." /></Card>
      </>
    );
  }

  const [districts, matrix, areas] = await Promise.all([districtDistribution(), districtCategoryMatrix(), topAreas(selected ? { district: selected } : {}, 15)]);
  const located = districts.filter((d) => d.key !== "__null").reduce((a, d) => a + d.value, 0);
  const unlocated = kpis.total - located;
  const points = DISTRICTS.map((d) => {
    const row = matrix.find((m) => m.key === d)!;
    const top = MATRIX_COLS.map((c) => [c, row[c] ?? 0] as const).sort((a, b) => b[1] - a[1])[0];
    return {
      key: d,
      label: DISTRICT_LABELS[d],
      lat: DISTRICT_CENTROIDS[d][0],
      lng: DISTRICT_CENTROIDS[d][1],
      value: row.total,
      topCategory: top && top[1] > 0 ? CATEGORY_LABELS[top[0]] : undefined,
    };
  });

  return (
    <>
      {header}
      <SyntheticNotice count={kpis.synthetic} total={kpis.total} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader title="District map" description="Circle size is proportional to the number of records registered in each district" />
          <div className="p-3">
            <DistrictMap points={points} total={located} />
          </div>
          <div className="px-5 pb-4">
            <BasisNote>
              Markers are placed at approximate district reference points, not administrative boundaries. {formatNumber(located)} of{" "}
              {formatNumber(kpis.total)} records have a registration district
              {unlocated ? `; ${formatNumber(unlocated)} without a district are excluded from the map` : ""}.
            </BasisNote>
          </div>
        </Card>
        <Card>
          <CardHeader title="District ranking" description="Share of records with a known district" />
          <CardBody>
            <RankedBars data={districts.filter((d) => d.key !== "__null")} total={located} color="var(--chart-3)" />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {points.map((p) => (
          <Link
            key={p.key}
            href={selected === p.key ? "/locations" : `/locations?district=${p.key}#areas`}
            className={cn(
              "rounded-xl border bg-surface p-4 shadow-card transition-colors hover:border-primary/50",
              selected === p.key ? "border-primary ring-2 ring-primary/20" : "border-border",
            )}
          >
            <div className="text-xs font-medium text-muted">{p.label}</div>
            <div className="tabular mt-1 text-xl font-semibold tracking-tight">{formatNumber(p.value)}</div>
            <div className="text-xs text-subtle">{formatPercent(p.value, located)} of located</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <Card id="areas" className="scroll-mt-24">
          <CardHeader
            title={selected ? `Top areas · ${DISTRICT_LABELS[selected]}` : "Top areas · all districts"}
            description="Registration areas with the most records — select a district card to focus"
          />
          <CardBody>
            {areas.length ? (
              <RankedBars data={areas.map((a) => ({ ...a, label: selected ? a.label : `${a.label} · ${a.district.replace("Karachi ", "")}` }))} color="var(--chart-4)" />
            ) : (
              <EmptyState title="No area-level data" description="Records in this scope don't have a registration area." />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="District × category" description="Records per category in each district" />
          <Table>
            <THead>
              <tr>
                <TH>District</TH>
                {MATRIX_COLS.map((c) => <TH key={c} className="text-right">{CATEGORY_LABELS[c].replace(" Vehicle", "")}</TH>)}
                <TH className="text-right">Total</TH>
              </tr>
            </THead>
            <tbody>
              {matrix.map((r) => (
                <TR key={r.key}>
                  <TD className="font-medium">
                    <Link href={`/vehicles?district=${r.key}`} className="hover:text-primary">{r.label}</Link>
                  </TD>
                  {MATRIX_COLS.map((c) => <TD key={c} className="tabular text-right text-muted">{r[c] ? formatNumber(r[c]!) : "—"}</TD>)}
                  <TD className="tabular text-right font-semibold">{formatNumber(r.total)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
