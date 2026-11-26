"use client";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Pencil, UserPlus } from "lucide-react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/constants";
import { createUserAction, resetPasswordAction, updateUserAction, type UserFormState } from "./actions";

function useClosingAction(action: (s: UserFormState, fd: FormData) => Promise<UserFormState>, onDone: () => void, message: string) {
  const [state, formAction, pending] = useActionState(action, {});
  useEffect(() => {
    if (state.ok) {
      toast.success(message);
      onDone();
    }
  }, [state, onDone, message]);
  return [state, formAction, pending] as const;
}

function ErrorLine({ error }: { error?: string }) {
  return error ? <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null;
}

export function CreateUserDialog({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><UserPlus /> New user</Button>
      </DialogTrigger>
      {open && <CreateUserForm roles={roles} onDone={() => setOpen(false)} />}
    </Dialog>
  );
}

function CreateUserForm({ roles, onDone }: { roles: Role[]; onDone: () => void }) {
  const [state, action, pending] = useClosingAction(createUserAction, onDone, "User created");
  const [role, setRole] = useState<Role>(roles.includes("VIEWER") ? "VIEWER" : roles[0]);
  return (
    <DialogContent title="Create user account" description="The user signs in with this email and initial password.">
      <form action={action} className="space-y-4">
        <ErrorLine error={state.error} />
        <Field label="Full name" htmlFor="cu-name" required><Input id="cu-name" name="name" required /></Field>
        <Field label="Email" htmlFor="cu-email" required><Input id="cu-email" name="email" type="email" required /></Field>
        <Field label="Role" htmlFor="cu-role" hint={ROLE_DESCRIPTIONS[role]}>
          <Select id="cu-role" name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </Select>
        </Field>
        <Field label="Initial password" htmlFor="cu-password" hint="At least 10 characters, letters and numbers" required>
          <Input id="cu-password" name="password" type="password" autoComplete="new-password" required />
        </Field>
        <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />} Create account</Button></div>
      </form>
    </DialogContent>
  );
}

export function EditUserDialog({ user, roles, isSelf }: { user: { id: string; name: string; email: string; role: Role; status: string }; roles: Role[]; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${user.email}`}><Pencil /></Button>
      </DialogTrigger>
      {open && <EditUserForm user={user} roles={roles} isSelf={isSelf} onDone={() => setOpen(false)} />}
    </Dialog>
  );
}

function EditUserForm({ user, roles, isSelf, onDone }: { user: { id: string; name: string; email: string; role: Role; status: string }; roles: Role[]; isSelf: boolean; onDone: () => void }) {
  const [state, action, pending] = useClosingAction(updateUserAction.bind(null, user.id), onDone, "User updated");
  return (
    <DialogContent title={`Edit ${user.email}`} description={isSelf ? "You cannot change your own role or status." : "Role or status changes sign the user out of active sessions."}>
      <form action={action} className="space-y-4">
        <ErrorLine error={state.error} />
        <Field label="Full name" htmlFor="eu-name"><Input id="eu-name" name="name" defaultValue={user.name} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Role" htmlFor="eu-role">
            <Select id="eu-role" name="role" defaultValue={user.role} disabled={isSelf}>
              {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
            {isSelf && <input type="hidden" name="role" value={user.role} />}
          </Field>
          <Field label="Status" htmlFor="eu-status">
            <Select id="eu-status" name="status" defaultValue={user.status} disabled={isSelf}>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
            {isSelf && <input type="hidden" name="status" value={user.status} />}
          </Field>
        </div>
        <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />} Save</Button></div>
      </form>
    </DialogContent>
  );
}

export function ResetPasswordDialog({ user }: { user: { id: string; email: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Reset password for ${user.email}`}><KeyRound /></Button>
      </DialogTrigger>
      {open && <ResetForm user={user} onDone={() => setOpen(false)} />}
    </Dialog>
  );
}

function ResetForm({ user, onDone }: { user: { id: string; email: string }; onDone: () => void }) {
  const [state, action, pending] = useClosingAction(resetPasswordAction.bind(null, user.id), onDone, "Password reset");
  return (
    <DialogContent title="Reset password" description={`Sets a new password for ${user.email} and signs them out everywhere.`}>
      <form action={action} className="space-y-4">
        <ErrorLine error={state.error} />
        <Field label="New password" htmlFor="rp-password" hint="At least 10 characters, letters and numbers"><Input id="rp-password" name="password" type="password" autoComplete="new-password" required /></Field>
        <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />} Reset password</Button></div>
      </form>
    </DialogContent>
  );
}
