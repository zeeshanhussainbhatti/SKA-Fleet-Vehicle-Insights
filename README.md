# SKA Vehicle Intelligence (SKA-VI)

**Karachi Vehicle Data & Analytics Platform** — *Complete Vehicle Intelligence. One Platform.*
Brand owner: Syed Kashif Ali

An enterprise vehicle registry, search engine and business-intelligence platform for Karachi's seven districts, designed to scale across Pakistan.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn-style UI primitives (Radix) · PostgreSQL · Prisma ORM · Recharts · Leaflet · ExcelJS · PDFKit

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** | KPI cards (total vehicles, cars, motorcycles, commercial, manufacturers, models, last 30 days, districts), database growth, category / manufacturer / model-year / district distribution, registration trends and recently added records |
| **Vehicle Database** | Full record (unique `SKA-0000001` ID, registration no., category, make, model, variant, years, CC, fuel, transmission, colour, body type, district, area, status, data source, timestamps). Create, edit, delete and view change history |
| **Advanced Search** | Free text plus registration, make, model, category, district, area, manufacturing and registration year ranges, CC range, fuel, transmission, status, colour and source, in any combination. Sortable columns, pagination, and CSV / Excel / PDF download of the results |
| **Analytics** | Top brands and models, fleet mix, car vs motorcycle by district, vehicle age, manufacturing years, engine capacity bands, fuel and transmission, commercial vehicles, monthly and annual registrations, data coverage. Can be scoped by district and category |
| **Location Intelligence** | Proportional-symbol map of the 7 districts, district ranking, top areas per district, district × category matrix |
| **Data Management** | CSV and Excel import with flexible header matching, validation, normalisation, duplicate detection (within the file and against the database; skip or update), a "validate only" mode, import history, per-row error reports (CSV download), blank templates, CSV / Excel / PDF exports and an analytics summary PDF |
| **Security** | JWT session cookies (httpOnly), bcrypt passwords, account lockout after 5 failed attempts, session revocation on password or role change, role-based permissions checked on every page, action and API call, and a full audit log (sign-ins, CRUD with before/after diffs, imports, exports, user admin) |
| **Roles** | Super Admin (full control) · Administrator · Data Manager · Viewer. The permission matrix is shown on the Users page |
| **UI** | Navy / white / blue enterprise theme, light and dark modes, responsive down to phone width |

### Data integrity principles

- **No fabricated statistics.** Every figure is computed live from stored records. Empty databases show empty states, not placeholder numbers, and each chart states how many records it is based on.
- **No personal ownership data.** The schema deliberately has no owner name, CNIC, phone or address fields. Add them only where legally authorised.
- **Synthetic test data is quarantined.** `npm run seed:synthetic` creates records labelled `SYNTHETIC DEMO DATA — NOT REAL` (registration numbers `ZZ-DEMO-…`). While any exist, the app shows a warning banner and the PDF carries a warning line. A Super Admin can purge them in one click from *Import & History*.

## Getting started

```bash
cp .env.example .env          # set DATABASE_URL, DATABASE_URL_UNPOOLED, AUTH_SECRET (32+ chars), seed admin credentials
npm install                   # also runs prisma generate
npx prisma migrate deploy     # create tables
npm run db:seed               # Super Admin + Karachi reference areas (no vehicles)
npm run dev                   # http://localhost:3000
```

Optional, for UI testing only: `npm run seed:synthetic -- 2000`

Production: `npm run build && npm start`. Set `AUTH_SECRET` to a strong random value (`openssl rand -base64 48`).

## Deploying to Vercel

Project settings live in `vercel.ts` (Next.js framework, `npm ci`, `prisma generate && prisma migrate deploy && next build`, Frankfurt `fra1` region, next to the database, security and no-cache API headers).

1. Import the repository in Vercel.
2. Add a Postgres database, e.g. Neon under **Storage**, connected to Production, Preview and Development. Pick **Frankfurt (AWS eu-central-1)**, the nearest Neon region to Karachi, so it sits next to the functions (`fra1`). Neon's integration sets both `DATABASE_URL` (pooled, used by the app) and `DATABASE_URL_UNPOOLED` (direct, used by migrations). With another provider, set both yourself; without a connection pooler they can be the same value.
3. Set `AUTH_SECRET` in **Settings → Environment Variables**.
4. Deploy. Migrations run automatically on every build.
5. Create the first Super Admin once from your machine:
   `DATABASE_URL=… DATABASE_URL_UNPOOLED=… SEED_SUPERADMIN_EMAIL=… SEED_SUPERADMIN_PASSWORD=… npm run db:seed`

## Import format

Download the template from *Import & History*. Required columns: **Registration Number, Vehicle Category, Manufacturer, Model**. Optional: Variant, Manufacturing Year, Registration Year, Registration Date (YYYY-MM-DD), Engine Capacity (CC), Fuel Type, Transmission, Vehicle Color, Body Type, Registration District, Registration Area, Vehicle Status, Data Source.

Common aliases are accepted, for example `Make` → Manufacturer, `Bike` → Motorcycle and `District South` → Karachi South. Limits: 4 MB and 50,000 rows per file.

## Project layout

```
prisma/schema.prisma        data model (users, vehicles, makes/models/areas, imports, audit)
src/proxy.ts                auth gate + security headers
src/lib/                    auth (JWT, sessions, permissions), validation schema, query builder, constants
src/server/                 analytics aggregations, import pipeline, exports, PDF reports
src/app/(app)/              dashboard, vehicles, analytics, locations, data, users, audit, account
src/app/api/                import, export, templates, error reports, summary report
```

## Scaling notes

- `District` is an enum and `Area` a table, so extending to other cities means adding a `City` table and widening the district enum.
- All filter columns are indexed. Analytics use `GROUP BY` and SQL bucketing, not in-memory processing.
- For multi-million-row datasets, add materialised views for the dashboard aggregates and move imports to a background queue.
