# BizzPal

BizzPal is an AI business operating system for founders: a customer dashboard (briefings, advisors, simulator, gap register, tasks, knowledge hub), the DataPal lead finder, payments, and a private admin console.

Built with Next.js 14 (App Router), React 18, Tailwind CSS and a SQLite database. Runs on a single Linux VM with PM2.

## Requirements

- Node.js **22.13 or newer** (the app uses Node's built-in SQLite)
- npm

## Run it locally

```bash
npm install
# create a file named .env next to package.json (see "Settings" below), then:
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check (also strict about unused code) |
| `npm run test:security` | Integration tests for sign-in, passwords and customer data separation. Needs the app running; see [tests](#tests) |
| `npm run backup:db` | Safe copy of the database, keeps the last 14 |

## Settings

All settings live in a private `.env` file next to `package.json`. It is never committed. Nothing has a built-in default for secrets: the app refuses to start sign-in without them.

**Required**

| Setting | Purpose |
| --- | --- |
| `SUPERADMIN_PASSCODE` | Admin console sign-in passcode |
| `ADMIN_SESSION_SECRET` | Secret that signs admin and customer sessions. Use a long random value |
| `APP_URL`, `NEXT_PUBLIC_APP_URL` | The public address of the site, for example `https://app.example.com` |
| `GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in and Google Drive connection |

**Strongly recommended on the live server**

| Setting | Purpose |
| --- | --- |
| `BIZZPAL_DATA_DIR` | Folder for the database, **outside** the app folder (for example `/home/it/bizzpal-data`) so deploys never touch it |
| `SECRETS_KEY` | Key that encrypts stored connection tokens and payment keys. Falls back to `ADMIN_SESSION_SECRET` |

**Optional features**

| Setting | Purpose |
| --- | --- |
| `GOOGLE_PLACES_API_KEY` (also read from `GOOGLE_MAPS_API_KEY`, `GEMINI_MAPS_API_KEY`) | DataPal business search |
| `PLACES_COST_PER_REQUEST_USD`, `USD_TO_INR_RATE` | Cost estimate shown on the admin DataPal Usage page |
| `GCP_BILLING_EXPORT_TABLE`, `GCP_BILLING_SERVICE_ACCOUNT`, `GCP_CREDITS_TOTAL` | Real Google Cloud spend on the admin DataPal Usage page (needs the BigQuery billing export) |
| `GOOGLE_PICKER_API_KEY`, `GOOGLE_PROJECT_NUMBER` | Google Drive file picker |
| `MICROSOFT_CLIENT_ID`, `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | OneDrive connection |
| `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, `COHERE_API_KEY` | AI advisors (tried in turn until one answers) |
| `RAZORPAY_KEY_ID`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Real payments. Without them payments are unavailable on a live server |
| `ALLOW_SIMULATED_PAYMENTS=true` | **Local test machine only.** Lets the fake "Complete test payment" checkout run. Never set it on the live server |
| `GST_API_PROVIDER`, `GST_API_KEY`, `GST_API_BASE_URL`, `KYC_API_KEY`, `KYC_API_BASE_URL`, `IFSC_API_BASE` | Business verification services |
| `WHATSAPP_WEBHOOK_TOKEN`, `WHATSAPP_APP_SECRET`, `STRIPE_WEBHOOK_SECRET` | Webhook signature checks |
| `POSTGRES_URL`, `DATABASE_URL` | Optional PostgreSQL for the knowledge search (SQLite is used otherwise) |

## Project layout

```
src/
  app/            Pages and API routes (Next.js App Router)
    (app)/        The signed-in customer app
    admin/        Admin console
    api/          Server APIs; customer APIs all start with requireUser()
  components/     React components, grouped by feature (datapal, onboarding, shell, ui, ...)
  lib/            Server and client logic
    auth/         Passwords, sign-in helpers, requireUser()
    db/           SQLite database and queries
    datapal/      DataPal search, credits, export
    payments/     Razorpay and Stripe helpers
    ...
  config/         Seed data and platform configuration defaults
  middleware.ts   Protects /admin and /api/admin
scripts/          Maintenance scripts (database backup)
tests/            Integration tests
docs/             Deployment guide
public/           Static files
```

## How sign-in and customer data work

- Customers sign in with email and password or with Google. The server then sets a signed, HTTP-only session cookie.
- Every customer API calls `requireUser(req)`, which reads that cookie. The customer's email comes from the cookie only, never from the request body or URL.
- Each customer has their own business (`biz_<email>`). Queries are always filtered by it, so one customer cannot read or change another's data.
- Passwords are stored as salted scrypt hashes. Repeated wrong passwords lock the account for 15 minutes.
- The admin console uses a separate passcode and cookie (`/admin/login`).

## Tests

The tests talk to a running copy of the app and clean up after themselves. Run them against a **local** copy only, because they create and delete test accounts in the local database.

```bash
npm run dev            # terminal 1
npm run test:security  # terminal 2
```

They need `ADMIN_SESSION_SECRET` in `.env` (to sign test sessions). Set `BASE_URL` to test a different address.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
