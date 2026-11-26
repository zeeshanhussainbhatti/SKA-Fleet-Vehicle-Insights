/**
 * Base seed: creates the initial Super Admin and Karachi reference areas.
 * It inserts NO vehicle records — all statistics come from real imported data.
 *
 * Runs locally (`npm run db:seed`) and on every Vercel build. It is
 * idempotent: an existing account is never modified, so a changed password
 * is never overwritten. With SEED_SUPERADMIN_EMAIL unset, it only ensures
 * reference areas.
 */
import { PrismaClient, type District } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { SEED_AREAS } from "../src/lib/constants";
import { passwordSchema } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
  const inCi = Boolean(process.env.CI || process.env.VERCEL);
  let password = process.env.SEED_SUPERADMIN_PASSWORD ?? "";
  let generated = false;

  const existing = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!email) {
    console.log("• SEED_SUPERADMIN_EMAIL not set — skipping Super Admin creation.");
  } else if (existing) {
    console.log(`✓ Super Admin ${email} already exists — unchanged.`);
  } else {
    if (!password) {
      // Never print a generated password into shared build logs.
      if (inCi) throw new Error("SEED_SUPERADMIN_PASSWORD must be set to create the Super Admin during a build.");
      password = randomBytes(12).toString("base64url");
      generated = true;
    }
    const strong = passwordSchema.safeParse(password);
    if (!strong.success) throw new Error(`SEED_SUPERADMIN_PASSWORD rejected: ${strong.error.issues[0].message}.`);
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
