"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, Menu, Search, X } from "lucide-react";
import { SidebarNav } from "./sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Permission } from "@/lib/auth/permissions";
import { logoutAction } from "@/app/login/actions";

export function AppShell({
  user,
  roleLabel,
  permissions,
  children,
}: {
  user: { name: string; email: string };
  roleLabel: string;
  permissions: Permission[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-navy lg:block">
        <SidebarNav permissions={permissions} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-navy shadow-pop">
            <button
              className="absolute right-3 top-4 rounded-md p-1.5 text-blue-100/70 hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
            <SidebarNav permissions={permissions} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <form
            className="relative max-w-md flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q")?.toString().trim();
              router.push(q ? `/vehicles?q=${encodeURIComponent(q)}` : "/vehicles");
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <input
              name="q"
              placeholder="Search registration no., make or model…"
              className="h-9 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm placeholder:text-subtle focus:border-ring focus:bg-surface focus:outline-none"
              aria-label="Quick vehicle search"
            />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-surface-2" aria-label="Account menu">
                  <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-navy-3 text-xs font-semibold text-white">
                    {initials}
                  </span>
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-[13px] font-medium text-foreground">{user.name}</span>
                    <span className="block text-[11px] text-muted">{roleLabel}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <KeyRound /> Account & password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => logoutAction()}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
