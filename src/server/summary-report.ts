import "server-only";
import PDFDocument from "pdfkit";
import { BRAND, CATEGORY_LABELS, DISTRICT_LABELS, SYNTHETIC_SOURCE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  ageDistribution,
  categoryDistribution,
  dataCompleteness,
  districtDistribution,
  engineStats,
  fuelDistribution,
  topManufacturers,
  topModels,
  type Datum,
  type Scope,
} from "@/server/analytics";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/utils";

/** One-document analytics summary, generated from live records. */
export async function buildSummaryPdf(scope: Scope, generatedBy: string) {
  const [completeness, categories, districts, brands, models, fuel, age, engine, synthetic] = await Promise.all([
    dataCompleteness(scope),
    categoryDistribution(scope),
    districtDistribution(scope),
    topManufacturers(scope, 10),
    topModels(scope, 10),
    fuelDistribution(scope),
    ageDistribution(scope),
    engineStats(scope),
    prisma.vehicle.count({ where: { dataSource: SYNTHETIC_SOURCE, ...(scope.district && { district: scope.district }), ...(scope.category && { category: scope.category }) } }),
  ]);
  const total = completeness.total;

  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true, info: { Title: `${BRAND.short} Analytics Summary`, Author: BRAND.name } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((r) => doc.on("end", () => r(Buffer.concat(chunks))));
  const navy = "#0B1F4B";
  const W = doc.page.width;
  const L = 40;
  const usable = W - 80;

  doc.rect(0, 0, W, 86).fill(navy);
  doc.fillColor("#fff").font("Helvetica-Bold").fontSize(20).text(BRAND.name, L, 22);
  doc.font("Helvetica").fontSize(9.5).fillColor("#BFD3FF").text(`${BRAND.description} — Analytics Summary`, L, 50);
  doc.fontSize(8.5).fillColor("#fff").text(`Generated ${formatDateTime(new Date())} by ${generatedBy}`, L, 66);

  const scopeText = [scope.district && DISTRICT_LABELS[scope.district], scope.category && CATEGORY_LABELS[scope.category]].filter(Boolean).join(" · ") || "All records";
  doc.fillColor(navy).font("Helvetica-Bold").fontSize(12).text(`Scope: ${scopeText}`, L, 104);
  doc.font("Helvetica").fontSize(9).fillColor("#475569").text(`${formatNumber(total)} records in scope. All figures are computed from records stored in the SKA-VI database at generation time.`, L, 122, { width: usable });
  if (synthetic) {
    doc.fillColor("#B45309").font("Helvetica-Bold").text(`WARNING: ${formatNumber(synthetic)} records in scope are synthetic demo data and are not real vehicles.`, L, 138, { width: usable });
    doc.font("Helvetica");
  }

  let y = 162;
  const tiles = [
    ["Records", formatNumber(total)],
    ["Average age", age.averageAge !== null ? `${age.averageAge} yrs` : "—"],
    ["Average engine", engine.avg !== null ? `${formatNumber(engine.avg)} cc` : "—"],
    ["Manufacturers (top list)", formatNumber(brands.length)],
  ];
  const tw = (usable - 30) / 4;
  tiles.forEach(([l, v], i) => {
    const x = L + i * (tw + 10);
    doc.roundedRect(x, y, tw, 46, 4).fillAndStroke("#F1F5FB", "#D6E0F0");
    doc.fillColor("#64748B").fontSize(7.5).text(l.toUpperCase(), x + 8, y + 8, { width: tw - 16 });
    doc.fillColor(navy).font("Helvetica-Bold").fontSize(14).text(v, x + 8, y + 22, { width: tw - 16 });
    doc.font("Helvetica");
  });
  y += 66;

  const table = (title: string, data: Datum[], x: number, w: number, startY: number) => {
    let yy = startY;
    doc.fillColor(navy).font("Helvetica-Bold").fontSize(10.5).text(title, x, yy);
    yy += 16;
    const max = Math.max(1, ...data.map((d) => d.value));
    for (const d of data.slice(0, 10)) {
      doc.font("Helvetica").fontSize(8.5).fillColor("#0F172A").text(d.label, x, yy, { width: w * 0.5, lineBreak: false, ellipsis: true });
      doc.fillColor("#475569").text(`${formatNumber(d.value)}  (${formatPercent(d.value, total)})`, x + w * 0.5, yy, { width: w * 0.5, align: "right" });
      doc.rect(x, yy + 11, w, 3).fill("#E7ECF5");
      doc.rect(x, yy + 11, (d.value / max) * w, 3).fill("#2563EB");
      yy += 20;
    }
    if (!data.length) {
      doc.fontSize(8.5).fillColor("#94A3B8").text("No data", x, yy);
      yy += 16;
    }
    return yy;
  };
  const colW = (usable - 24) / 2;
  const r1 = Math.max(table("Vehicle categories", categories, L, colW, y), table("Districts", districts, L + colW + 24, colW, y));
  const r2 = Math.max(table("Top manufacturers", brands, L, colW, r1 + 14), table("Top models", models, L + colW + 24, colW, r1 + 14));
  if (r2 > doc.page.height - 260) doc.addPage();
  const y3 = r2 > doc.page.height - 260 ? 40 : r2 + 14;
  const r3 = Math.max(table("Fuel types", fuel, L, colW, y3), table("Vehicle age", age.buckets, L + colW + 24, colW, y3));

  let yq = r3 + 14;
  if (yq > doc.page.height - 200) {
    doc.addPage();
    yq = 40;
  }
  doc.fillColor(navy).font("Helvetica-Bold").fontSize(10.5).text("Data coverage", L, yq);
  yq += 16;
  for (const f of completeness.fields) {
    doc.font("Helvetica").fontSize(8.5).fillColor("#0F172A").text(f.label, L, yq, { width: 160 });
    doc.fillColor("#475569").text(`${formatNumber(f.value)} of ${formatNumber(total)} (${formatPercent(f.value, total)})`, L + 160, yq);
    yq += 14;
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(7).fillColor("#94A3B8").text(`${BRAND.short} · ${BRAND.tagline} · Page ${i + 1} of ${range.count}`, L, doc.page.height - 28, { width: usable, align: "center", lineBreak: false });
  }
  doc.end();
  return done;
}
