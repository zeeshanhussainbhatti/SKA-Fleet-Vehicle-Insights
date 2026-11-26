"use client";
import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { changePasswordAction, type PwState } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PwState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="max-w-md space-y-4">
      {state.error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p className="flex items-center gap-2 rounded-md bg-success-soft px-3 py-2 text-sm text-success"><CheckCircle2 className="size-4" /> Password changed. Other sessions were signed out.</p>}
      <Field label="Current password" htmlFor="current"><Input id="current" name="current" type="password" autoComplete="current-password" required /></Field>
      <Field label="New password" htmlFor="next" hint="At least 10 characters, letters and numbers"><Input id="next" name="next" type="password" autoComplete="new-password" required /></Field>
      <Field label="Confirm new password" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></Field>
      <Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />} Update password</Button>
    </form>
  );
}
