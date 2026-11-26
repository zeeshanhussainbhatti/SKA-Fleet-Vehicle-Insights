"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { SYNTHETIC_SOURCE } from "@/lib/constants";

/** Super Admin only: remove every synthetic demo record and orphaned demo reference rows. */
export async function purgeSyntheticAction() {
  const user = await assertPermission("data:purge-synthetic");
  const { count } = await prisma.vehicle.deleteMany({ where: { dataSource: SYNTHETIC_SOURCE } });
  const models = await prisma.vehicleModel.deleteMany({ where: { vehicles: { none: {} }, manufacturer: { vehicles: { none: {} } } } });
  const makes = await prisma.manufacturer.deleteMany({ where: { vehicles: { none: {} } } });
  await audit({ user, action: "SYNTHETIC_PURGE", entityType: "Vehicle", summary: `Purged ${count} synthetic demo records`, details: { vehicles: count, models: models.count, manufacturers: makes.count } });
  revalidatePath("/", "layout");
}
