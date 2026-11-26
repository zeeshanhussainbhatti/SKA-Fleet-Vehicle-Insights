"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertPermission, AuthError } from "@/lib/auth/session";
import { canManageRole } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { passwordSchema } from "@/lib/password";
import { ROLE_LABELS } from "@/lib/constants";

export type UserFormState = { ok?: boolean; error?: string };

const roleEnum = z.enum(["SUPER_ADMIN", "ADMIN", "DATA_MANAGER", "VIEWER"]);

async function activeSuperAdmins(excludeId?: string) {
  return prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE", ...(excludeId && { id: { not: excludeId } }) } });
}

export async function createUserAction(_: UserFormState, fd: FormData): Promise<UserFormState> {
  try {
    const actor = await assertPermission("user:manage");
    const parsed = z
      .object({
        name: z.string().trim().min(2, "Name is required").max(100),
        email: z.string().trim().toLowerCase().email("Enter a valid email"),
        role: roleEnum,
        password: passwordSchema,
      })
      .safeParse(Object.fromEntries(fd));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { name, email, role, password } = parsed.data;
    if (!canManageRole(actor.role, role)) return { error: `You cannot create ${ROLE_LABELS[role]} accounts.` };
    if (await prisma.user.findUnique({ where: { email } })) return { error: "An account with this email already exists." };
    const u = await prisma.user.create({ data: { name, email, role, passwordHash: await bcrypt.hash(password, 12), createdById: actor.id } });
    await audit({ user: actor, action: "USER_CREATE", entityType: "User", entityId: u.id, summary: `Created ${ROLE_LABELS[role]} account ${email}` });
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}

export async function updateUserAction(id: string, _: UserFormState, fd: FormData): Promise<UserFormState> {
  try {
    const actor = await assertPermission("user:manage");
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return { error: "User not found." };
    const parsed = z
      .object({ name: z.string().trim().min(2).max(100), role: roleEnum, status: z.enum(["ACTIVE", "SUSPENDED"]) })
      .safeParse(Object.fromEntries(fd));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { name, role, status } = parsed.data;
    if (!canManageRole(actor.role, target.role) || !canManageRole(actor.role, role as Role)) return { error: "You are not allowed to manage this account or assign that role." };
    if (target.id === actor.id && (role !== target.role || status !== target.status)) return { error: "You cannot change your own role or status." };
    if (target.role === "SUPER_ADMIN" && (role !== "SUPER_ADMIN" || status !== "ACTIVE") && (await activeSuperAdmins(target.id)) === 0) {
      return { error: "At least one active Super Admin must remain." };
    }
    const invalidate = role !== target.role || status !== target.status;
    await prisma.user.update({ where: { id }, data: { name, role, status, ...(invalidate && { sessionVersion: { increment: 1 } }) } });
    const changes: Record<string, { from: string; to: string }> = {};
    if (name !== target.name) changes.name = { from: target.name, to: name };
    if (role !== target.role) changes.role = { from: target.role, to: role };
    if (status !== target.status) changes.status = { from: target.status, to: status };
    if (Object.keys(changes).length)
      await audit({ user: actor, action: "USER_UPDATE", entityType: "User", entityId: id, summary: `Updated ${target.email}: ${Object.keys(changes).join(", ")}`, details: changes });
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}

export async function resetPasswordAction(id: string, _: UserFormState, fd: FormData): Promise<UserFormState> {
  try {
    const actor = await assertPermission("user:manage");
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return { error: "User not found." };
    if (!canManageRole(actor.role, target.role)) return { error: "You are not allowed to manage this account." };
    const parsed = passwordSchema.safeParse(fd.get("password"));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(parsed.data, 12), sessionVersion: { increment: 1 }, failedLoginCount: 0, lockedUntil: null },
    });
    await audit({ user: actor, action: "USER_PASSWORD_RESET", entityType: "User", entityId: id, summary: `Reset password for ${target.email} (sessions revoked)` });
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}
