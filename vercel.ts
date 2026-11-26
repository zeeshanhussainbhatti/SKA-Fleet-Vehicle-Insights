import { routes, type VercelConfig } from "@vercel/config/v1";

/**
 * Vercel project configuration for SKA Vehicle Intelligence (SKA-VI).
 *
 * Required project environment variables (Settings → Environment Variables):
 *   DATABASE_URL           pooled PostgreSQL connection string, used by the app
 *   DATABASE_URL_UNPOOLED  direct connection string, used by `prisma migrate deploy`
 *   (Neon's Vercel integration sets both automatically)
 *   AUTH_SECRET            32+ random characters — `openssl rand -base64 48`
 *
 * Create the first Super Admin once, from your machine, against the
 * production database: `npm run db:seed` with SEED_SUPERADMIN_* set.
 */
const config: VercelConfig = {
  framework: "nextjs",
  installCommand: "npm ci",
  // Apply pending Prisma migrations before every build so schema and code ship together.
  buildCommand: "prisma migrate deploy && next build",

  // Mumbai is the closest Vercel region to Karachi. Keep functions in the
  // same region as the database (e.g. Neon "AWS ap-south-1") for low latency.
  regions: ["bom1"],

  headers: [
    routes.header("/(.*)", [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ]),
    // Authenticated data and file downloads must never be cached by the CDN.
    routes.cacheControl("/api/(.*)", { private: true, noStore: true }),
  ],
};

export default config;
