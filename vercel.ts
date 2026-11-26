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
 * Optional: SEED_SUPERADMIN_EMAIL + SEED_SUPERADMIN_PASSWORD create the first
 * Super Admin during the build (existing accounts are never changed).
 */
const config: VercelConfig = {
  framework: "nextjs",
  installCommand: "npm ci",
  // Generate the Prisma client explicitly (newer npm versions may skip
  // dependency install scripts such as `postinstall`), apply pending
  // migrations, then run the idempotent seed: it ensures reference areas and,
  // when SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_PASSWORD are set on the
  // project, creates that Super Admin if it doesn't exist yet.
  buildCommand: "prisma generate && prisma migrate deploy && prisma db seed && next build",

  // Functions must run in the same region as the database: every page makes
  // several queries, so app-to-database distance matters most. Neon's Vercel
  // integration offers no Asian region, and Frankfurt (AWS eu-central-1) is
  // its nearest region to Karachi. Change both together if you move the database.
  regions: ["fra1"],

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
