import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requestMeta, type CurrentUser } from "@/lib/auth/session";

export type AuditAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "VEHICLE_CREATE"
  | "VEHICLE_UPDATE"
  | "VEHICLE_DELETE"
  | "VEHICLE_BULK_DELETE"
  | "IMPORT"
  | "IMPORT_VALIDATE"
  | "EXPORT"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_PASSWORD_RESET"
  | "SYNTHETIC_PURGE";

export async function audit(params: {
  user: Pick<CurrentUser, "id" | "email"> | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  details?: Prisma.InputJsonValue;
}) {
  try {
    const meta = await requestMeta();
    await prisma.auditLog.create({
      data: {
        userId: params.user?.id ?? null,
        userEmail: params.user?.email ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        summary: params.summary,
        details: params.details,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
  } catch (err) {
    // Audit failures must never break the primary operation, but must be visible.
    console.error("[audit] failed to write audit log", err);
  }
}
