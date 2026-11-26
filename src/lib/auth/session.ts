import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { can, type Permission } from "./permissions";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./jwt";
import type { Role } from "@prisma/client";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export async function createSession(user: { id: string; role: Role; sessionVersion: number }) {
  const token = await signSession({ uid: user.id, role: user.role, ver: user.sessionVersion });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/**
 * Resolves the signed-in user, verifying the token AND the live account state
 * (active, session version unchanged) on every request. Memoised per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const claims = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const user = await prisma.user.findUnique({
    where: { id: claims.uid },
    select: { id: true, name: true, email: true, role: true, status: true, sessionVersion: true },
  });
  if (!user || user.status !== "ACTIVE" || user.sessionVersion !== claims.ver) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: redirect away when the permission is missing. */
export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/dashboard?denied=1");
  return user;
}

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

/** For server actions / route handlers: throw instead of redirecting. */
export async function assertPermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, "Not signed in.");
  if (!can(user.role, permission)) throw new AuthError(403, "You do not have permission for this action.");
  return user;
}

export async function requestMeta() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return {
    ipAddress: (fwd ? fwd.split(",")[0].trim() : h.get("x-real-ip")) ?? null,
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  };
}
