"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertPermission, AuthError } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { vehicleInputSchema } from "@/lib/vehicle-schema";
import { ReferenceResolver, diff, toVehicleData, vehicleSnapshot } from "@/server/vehicles";

export type VehicleFormState = { error?: string; fieldErrors?: Record<string, string> };

function parse(formData: FormData) {
  const raw: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") raw[k] = v;
  return vehicleInputSchema.safeParse(raw);
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "_");
    out[k] ??= i.message.charAt(0).toUpperCase() + i.message.slice(1);
  }
  return out;
}

export async function createVehicleAction(_: VehicleFormState, formData: FormData): Promise<VehicleFormState> {
  let id: string;
  try {
    const user = await assertPermission("vehicle:create");
    const parsed = parse(formData);
    if (!parsed.success) return { error: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
    const dup = await prisma.vehicle.findUnique({ where: { registrationNumber: parsed.data.registrationNumber }, select: { id: true } });
    if (dup) return { fieldErrors: { registrationNumber: `A record with registration ${parsed.data.registrationNumber} already exists.` }, error: "Duplicate registration number." };
    const data = await toVehicleData(parsed.data, new ReferenceResolver(), "Manual entry");
    const v = await prisma.vehicle.create({ data: { ...data, createdById: user.id, updatedById: user.id } });
    id = v.id;
    await audit({ user, action: "VEHICLE_CREATE", entityType: "Vehicle", entityId: v.id, summary: `Created vehicle ${v.registrationNumber}`, details: vehicleSnapshot(v) as Prisma.InputJsonValue });
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Duplicate registration number." };
    throw e;
  }
  revalidatePath("/vehicles");
  redirect(`/vehicles/${id}?created=1`);
}

export async function updateVehicleAction(id: string, _: VehicleFormState, formData: FormData): Promise<VehicleFormState> {
  try {
    const user = await assertPermission("vehicle:update");
    const before = await prisma.vehicle.findUnique({ where: { id } });
    if (!before) return { error: "Record not found — it may have been deleted." };
    const parsed = parse(formData);
    if (!parsed.success) return { error: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
    if (parsed.data.registrationNumber !== before.registrationNumber) {
      const dup = await prisma.vehicle.findUnique({ where: { registrationNumber: parsed.data.registrationNumber }, select: { id: true } });
      if (dup) return { fieldErrors: { registrationNumber: "Another record already uses this registration number." } };
    }
    const data = await toVehicleData(parsed.data, new ReferenceResolver(), before.dataSource);
    const after = await prisma.vehicle.update({ where: { id }, data: { ...data, updatedById: user.id } });
    const changes = diff(vehicleSnapshot(before), vehicleSnapshot(after));
    if (Object.keys(changes).length) {
      await audit({ user, action: "VEHICLE_UPDATE", entityType: "Vehicle", entityId: id, summary: `Updated ${after.registrationNumber}: ${Object.keys(changes).join(", ")}`, details: changes as Prisma.InputJsonValue });
    }
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Duplicate registration number." };
    throw e;
  }
  revalidatePath(`/vehicles/${id}`);
  redirect(`/vehicles/${id}?updated=1`);
}

export async function deleteVehicleAction(id: string) {
  const user = await assertPermission("vehicle:delete");
  const v = await prisma.vehicle.findUnique({ where: { id } });
  if (!v) redirect("/vehicles");
  await prisma.vehicle.delete({ where: { id } });
  await audit({ user, action: "VEHICLE_DELETE", entityType: "Vehicle", entityId: id, summary: `Deleted vehicle ${v.registrationNumber}`, details: vehicleSnapshot(v) as Prisma.InputJsonValue });
  revalidatePath("/vehicles");
  redirect("/vehicles?deleted=1");
}
