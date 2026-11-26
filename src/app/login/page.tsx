import type { Metadata } from "next";
import { BarChart3, Database, Lock, MapPinned } from "lucide-react";
import { BrandLockup, BrandMark } from "@/components/brand";
import { BRAND } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="pointer-events-none absolute -bottom-40 -right-24 size-[520px] rounded-full bg-primary/40 blur-[120px]" />
        <div className="relative">
          <BrandLockup inverted />
        </div>
        <div className="relative max-w-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-blue-100/80">
            {BRAND.description}
          </div>
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight">{BRAND.tagline}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-blue-100/70">
            A unified registry, search engine and analytics layer for vehicles across Karachi&apos;s seven
            districts — engineered to scale nationwide.
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-4 text-sm">
            {[
              { icon: Database, t: "Unified vehicle database", d: "Validated, de-duplicated records" },
              { icon: BarChart3, t: "Live analytics", d: "Computed from actual records only" },
              { icon: MapPinned, t: "Location intelligence", d: "District & area segmentation" },
              { icon: Lock, t: "Role-based security", d: "Full audit trail of every change" },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <Icon className="mb-3 size-5 text-accent" />
                <div className="font-medium">{t}</div>
                <div className="mt-0.5 text-xs text-blue-100/55">{d}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-blue-100/40">
          © {new Date().getFullYear()} {BRAND.owner}. {BRAND.name}.
        </div>
      </section>

      <section className="flex items-center justify-center bg-background px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark className="size-11" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Sign in to {BRAND.short}</h2>
          <p className="mt-1.5 text-sm text-muted">Authorised personnel only. All access is logged.</p>
          <div className="mt-8">
            <LoginForm next={next} />
          </div>
          <p className="mt-8 text-xs leading-relaxed text-subtle">
            Accounts are issued by your {BRAND.short} administrator. Repeated failed attempts temporarily lock the account.
          </p>
        </div>
      </section>
    </div>
  );
}
