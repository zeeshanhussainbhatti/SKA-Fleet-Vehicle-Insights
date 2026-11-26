"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Car,
  ClipboardList,
  FileDown,
  LayoutDashboard,
  MapPinned,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/auth/permissions";
import { BRAND } from "@/lib/constants";

type NavItem = { href: string; label: string; icon: React.ElementType; perm: Permission };

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Intelligence",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard:view" },
      { href: "/vehicles", label: "Vehicle Database", icon: Car, perm: "vehicle:view" },
      { href: "/analytics", label: "Analytics", icon: BarChart3, perm: "dashboard:view" },
      { href: "/locations", label: "Location Intelligence", icon: MapPinned, perm: "dashboard:view" },
    ],
  },
  {
    title: "Data Management",
    items: [
      { href: "/data/import", label: "Import & History", icon: Upload, perm: "data:import" },
      { href: "/data/reports", label: "Exports & Reports", icon: FileDown, perm: "vehicle:export" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/users", label: "Users & Roles", icon: Users, perm: "user:view" },
      { href: "/audit", label: "Audit Logs", icon: ClipboardList, perm: "audit:view" },
    ],
  },
];

export function SidebarNav({ permissions, onNavigate }: { permissions: Permission[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" onClick={onNavigate}>
          <BrandLockup inverted />
        </Link>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section) => {
          const items = section.items.filter((i) => permissions.includes(i.perm));
          if (!items.length) return null;
          return (
            <div key={section.title}>
              <div className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-blue-200/45">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                          active
                            ? "bg-white/[0.08] text-white"
                            : "text-blue-100/65 hover:bg-white/[0.04] hover:text-white",
                        )}
                      >
                        {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-accent" />}
                        <Icon className={cn("size-[18px]", active ? "text-accent" : "text-blue-200/50 group-hover:text-blue-100")} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="m-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="flex items-center gap-2 text-[12px] font-medium text-blue-100/80">
          <ShieldCheck className="size-4 text-accent" />
          {BRAND.description}
        </div>
        <div className="mt-1 text-[11px] text-blue-200/45">© {new Date().getFullYear()} {BRAND.owner}</div>
      </div>
    </div>
  );
}
