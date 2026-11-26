import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/lib/constants";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell user={{ name: user.name, email: user.email }} roleLabel={ROLE_LABELS[user.role]} permissions={ROLE_PERMISSIONS[user.role]}>
      {children}
    </AppShell>
  );
}
