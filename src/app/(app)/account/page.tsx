import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/constants";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const me = await requireUser();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Account" title={me.name} description={me.email} />
      <div className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader title="Your access" />
          <CardBody className="space-y-3 text-sm">
            <Badge tone="primary">{ROLE_LABELS[me.role]}</Badge>
            <p className="text-muted">{ROLE_DESCRIPTIONS[me.role]}</p>
            <p className="text-xs text-subtle">{ROLE_PERMISSIONS[me.role].length} permissions granted.</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Change password" description="Changing your password signs you out of every other session." />
          <CardBody><PasswordForm /></CardBody>
        </Card>
      </div>
    </div>
  );
}
