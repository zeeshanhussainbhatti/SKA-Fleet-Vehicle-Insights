"use server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { passwordSchema } from "@/lib/password";

export type PwState = { ok?: boolean; error?: string };

export async function changePasswordAction(_: PwState, fd: FormData): Promise<PwState> {
  const me = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = passwordSchema.safeParse(fd.get("next"));
  if (!next.success) return { error: next.error.issues[0].message };
  if (fd.get("next") !== fd.get("confirm")) return { error: "New passwords do not match." };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await bcrypt.compare(current, user.passwordHash))) return { error: "Current password is incorrect." };
  const updated = await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await bcrypt.hash(next.data, 12), sessionVersion: { increment: 1 } },
  });
  await createSession(updated); // keep this session, revoke all others
  await audit({ user: me, action: "PASSWORD_CHANGE", entityType: "User", entityId: me.id, summary: "Changed own password (other sessions revoked)" });
  return { ok: true };
}
