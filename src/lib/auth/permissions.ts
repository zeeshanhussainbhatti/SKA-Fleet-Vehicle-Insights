import type { Role } from "@prisma/client";

export type Permission =
  | "dashboard:view"
  | "vehicle:view"
  | "vehicle:create"
  | "vehicle:update"
  | "vehicle:delete"
  | "vehicle:export"
  | "data:import"
  | "data:import-history-all"
  | "data:purge-synthetic"
  | "user:view"
  | "user:manage"
  | "audit:view";

const ALL: Permission[] = [
  "dashboard:view",
  "vehicle:view",
  "vehicle:create",
  "vehicle:update",
  "vehicle:delete",
  "vehicle:export",
  "data:import",
  "data:import-history-all",
  "data:purge-synthetic",
  "user:view",
  "user:manage",
  "audit:view",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== "data:purge-synthetic"),
  DATA_MANAGER: [
    "dashboard:view",
    "vehicle:view",
    "vehicle:create",
    "vehicle:update",
    "vehicle:export",
    "data:import",
  ],
  VIEWER: ["dashboard:view", "vehicle:view", "vehicle:export"],
};

export function can(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

const RANK: Record<Role, number> = { SUPER_ADMIN: 4, ADMIN: 3, DATA_MANAGER: 2, VIEWER: 1 };

/**
 * Whether `actor` may create/modify an account holding `targetRole`.
 * Super Admins manage everyone; Admins only manage roles strictly below them.
 */
export function canManageRole(actor: Role, targetRole: Role) {
  if (actor === "SUPER_ADMIN") return true;
  if (actor === "ADMIN") return RANK[targetRole] < RANK.ADMIN;
  return false;
}

export function assignableRoles(actor: Role): Role[] {
  return (Object.keys(RANK) as Role[]).filter((r) => canManageRole(actor, r));
}
