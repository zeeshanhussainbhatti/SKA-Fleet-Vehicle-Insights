/**
 * Base seed: creates the initial Super Admin and Karachi reference areas.
 * It inserts NO vehicle records — all statistics come from real imported data.
 */
import { PrismaClient, type District } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { SEED_AREAS } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email) throw new Error("Set SEED_SUPERADMIN_EMAIL before seeding.");
  let password = process.env.SEED_SUPERADMIN_PASSWORD ?? "";
  let generated = false;
  if (!password) {
    password = randomBytes(12).toString("base64url");
    generated = true;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Super Admin ${email} already exists — unchanged.`);
  } else {
    await prisma.user.create({
      data: { email, name: "Super Administrator", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`✓ Created Super Admin ${email}${generated ? ` with generated password: ${password}` : ""}`);
  }

  let areas = 0;
  for (const [district, names] of Object.entries(SEED_AREAS) as [District, string[]][]) {
    for (const name of names) {
      await prisma.area.upsert({ where: { district_name: { district, name } }, create: { district, name }, update: {} });
      areas++;
    }
  }
  console.log(`✓ Ensured ${areas} reference areas across 7 Karachi districts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
