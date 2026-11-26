import "server-only";
import { prisma } from "@/lib/db";

export async function getFormSuggestions() {
  const [manufacturers, models, areas] = await Promise.all([
    prisma.manufacturer.findMany({ select: { name: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.vehicleModel.findMany({ select: { name: true }, orderBy: { name: "asc" }, distinct: ["name"], take: 1000 }),
    prisma.area.findMany({ select: { name: true }, orderBy: { name: "asc" }, distinct: ["name"], take: 1000 }),
  ]);
  return {
    manufacturers: manufacturers.map((m) => m.name),
    models: models.map((m) => m.name),
    areas: areas.map((a) => a.name),
  };
}
