import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "skavi_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export type SessionClaims = {
  uid: string;
  role: Role;
  ver: number;
};

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("ska-vi")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getKey());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), { issuer: "ska-vi", algorithms: ["HS256"] });
    if (typeof payload.uid !== "string" || typeof payload.ver !== "number") return null;
    return { uid: payload.uid, role: payload.role as Role, ver: payload.ver };
  } catch {
    return null;
  }
}
