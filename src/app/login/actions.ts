"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
// Constant-time-ish path for unknown accounts
const DUMMY_HASH = bcrypt.hashSync("ska-vi-timing-equaliser", 12);

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password, next } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const generic = "Invalid email or password.";

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    await audit({ user: null, action: "LOGIN_FAILED", entityType: "User", summary: `Failed sign-in for unknown account ${email}` });
    return { error: generic };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: `Account temporarily locked after repeated failed attempts. Try again after ${user.lockedUntil.toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" })}.` };
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failed >= MAX_FAILED ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      },
    });
    await audit({ user: { id: user.id, email: user.email }, action: "LOGIN_FAILED", entityType: "User", entityId: user.id, summary: `Failed sign-in (${failed}/${MAX_FAILED})` });
    return { error: generic };
  }
  if (user.status !== "ACTIVE") {
    return { error: "This account is suspended. Contact your administrator." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await createSession(user);
  await audit({ user: { id: user.id, email: user.email }, action: "LOGIN", entityType: "User", entityId: user.id, summary: "Signed in" });

  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  redirect(target);
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await audit({ user, action: "LOGOUT", entityType: "User", entityId: user.id, summary: "Signed out" });
  await destroySession();
  redirect("/login");
}
