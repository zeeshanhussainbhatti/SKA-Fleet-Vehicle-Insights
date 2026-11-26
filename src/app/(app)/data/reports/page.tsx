import type { Metadata } from "next";
import { BarChart3, FileSpreadsheet, FileText, Table2 } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { CATEGORY_LABELS, DISTRICT_LABELS } from "@/lib/constants";

export const metadata: Metadata = { title: "Exports & Reports" };

export default async function ReportsPage() {
  await requirePermission("vehicle:export");
  return (
    <>
      <PageHeader
        eyebrow="Data Management"
        title="Exports & reports"
        description="Download records and analytics generated live from the database. Every export is recorded in the audit log."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Table2 className="size-4 text-primary" /> Vehicle records export</span>} description="All fields, optionally scoped by district and category. For complex filters use the Vehicle Database search and export from there." />
          <CardBody>
            <form method="get" action="/api/export" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="District" htmlFor="ex-district">
                  <Select id="ex-district" name="district" defaultValue="">
                    <option value="">All districts</option>
                    {Object.entries(DISTRICT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </Select>
                </Field>
                <Field label="Category" htmlFor="ex-category">
                  <Select id="ex-category" name="category" defaultValue="">
                    <option value="">All categories</option>
                    {Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" name="format" value="csv" variant="secondary"><FileText /> CSV</Button>
                <Button type="submit" name="format" value="xlsx" variant="secondary"><FileSpreadsheet /> Excel (.xlsx)</Button>
                <Button type="submit" name="format" value="pdf" variant="secondary"><FileText /> PDF (first 2,000 rows)</Button>
              </div>
              <p className="text-xs text-subtle">CSV and Excel exports include up to 50,000 rows per file.</p>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><BarChart3 className="size-4 text-primary" /> Analytics summary report</span>} description="A branded PDF with categories, districts, top brands and models, fuel mix, vehicle age and data coverage." />
          <CardBody>
            <form method="get" action="/api/reports/summary" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="District" htmlFor="rp-district">
                  <Select id="rp-district" name="district" defaultValue="">
                    <option value="">All districts</option>
                    {Object.entries(DISTRICT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </Select>
                </Field>
                <Field label="Category" htmlFor="rp-category">
                  <Select id="rp-category" name="category" defaultValue="">
                    <option value="">All categories</option>
                    {Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </Select>
                </Field>
              </div>
              <Button type="submit"><FileText /> Generate PDF report</Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
