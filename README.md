# LumaSIM

A complete travel eSIM storefront: catalog, cart, guest checkout, payment,
eSIM delivery, customer account area, staff back office, SEO surfaces and a
WCAG 2.2 AA accessibility baseline.

> **Working name.** "LumaSIM" is a placeholder brand. Trademark and domain
> clearance is required before any public use — see `docs/OWNER-INPUTS.md`.

---

## 1. What is real and what is demo data

This repository is a **runnable MVP with a mock supplier and a demo checkout**.
Nothing in it invents a commercial fact: no prices, coverage, speeds, reviews or
supplier claims have been made up and presented as real.

| Area | Status in this build |
| --- | --- |
| Storefront, SEO, a11y, cart, checkout flow, account, admin | **Complete and working** |
| Catalog data (40 destinations, 153 plans) | **Sample/demo data** — every plan has `isDemo: true` and is labelled in the UI |
| Supplier / eSIM provisioning | **Mock adapter only.** `getSupplierAdapter()` throws on any other value, so the app cannot pretend to deliver |
| Payments | **Demo checkout** by default. Stripe Checkout code path is complete and used when `PAYMENTS_PROVIDER=stripe` with keys set |
| Transactional email | Marked `SIMULATED` in the database when `RESEND_API_KEY` is empty |
| Customer reviews | **None.** The review table is empty and the UI says so rather than showing invented testimonials |
| Legal policies | Written as reviewable drafts with a visible "requires legal review" banner |

To go live you must: connect a real supplier adapter, switch to Stripe live
keys, replace the demo catalog, confirm the legal documents, and work through
`docs/LAUNCH-CHECKLIST.md`.

---

## 2. Requirements

- **Node.js 20.9+** (developed on 24.x)
- npm (the lockfile is npm's)
- No database server needed locally — SQLite is used for zero-setup runs

## 3. Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux

# 3. Create the local database and load the demo catalog
npm run db:push
npm run db:seed

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000>.

`npm run db:reset` wipes and reseeds in one step if you want a clean slate.

### Demo credentials

The seed creates one administrator. These values are local-only and must be
rotated before any deployment:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@lumasim.example` | `LocalOnly-ChangeMe-2026!` |

Register a normal customer account through `/register` to exercise the
customer-side flows.

---

## 4. Walking through a purchase (demo payments)

`PAYMENTS_PROVIDER=mock` plus `ALLOW_MOCK_PAYMENTS=true` enables a local
checkout that behaves like the real thing but never touches a card:

1. Add a plan to the cart from any destination page (`/esim/japan`) or a plan
   page (`/plans/japan-1024mb-7d`).
2. Open `/cart`, apply a coupon if you created one in the admin area.
3. Continue to `/checkout`, enter guest details, accept the terms.
4. You are redirected to `/checkout/demo/<token>` — a page that shows exactly
   what a real payment would charge. Press **Simulate successful payment**.
5. The app records a `PaymentEvent`, decrements stock with a
   `stock >= quantity` guard, provisions eSIM profiles through the mock
   supplier (with retries) and marks the order `DELIVERED`.
6. You land on the order page (`/orders/<number>?token=…`) with the LPA string
   and QR code. Guest access works through the `publicToken`; signed-in
   customers also see the order under `/account`.

Set `MOCK_SUPPLIER_FAILURE_RATE=1` and repeat to watch the retry path, the
`FAILED` order status and the failure email instead.

To exercise the Stripe path you need a Stripe test account:
`PAYMENTS_PROVIDER=stripe`, `STRIPE_SECRET_KEY=sk_test_…`,
`STRIPE_WEBHOOK_SECRET=whsec_…`, then forward events with
`stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

---

## 5. Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (expected: no errors, no warnings) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (pricing, password hashing, validation, consent, search suggestions) |
| `npm run test:e2e` | Playwright: purchase flow, admin, 30-page accessibility sweep |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run db:push` | Apply the schema to the local database |
| `npm run db:seed` | Load the demo catalog and admin user |
| `npm run db:reset` | Force-reset + reseed |
| `npm run db:studio` | Prisma Studio |

Playwright starts its own server unless one is already listening on port 3000.

## 6. Verification status of this build

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passes |
| `npm run lint` | Passes, 0 errors / 0 warnings |
| `npm test` | 54 tests pass |
| `npm run test:e2e` | 34 tests pass (purchase, password reset, admin, accessibility) |
| Accessibility | 30 pages scanned with axe-core against WCAG 2.0/2.1/2.2 A+AA — no violations |

The accessibility suite covers every public page plus the cookie banner's first
visit and management panel, and a mobile viewport pass of the home page.

---

## 7. Project layout

```
prisma/            schema.prisma (data model), seed.ts, seed-data.ts
src/app/           App Router routes: storefront, account, admin, API handlers
src/actions/       Server Actions: auth, cart, checkout, contact, admin
src/components/    UI grouped by area (catalog, checkout, layout, ui, …)
src/content/       Copy and content: countries, FAQs, help articles, blog, legal
src/lib/           Domain logic: orders, payments, supplier, session, pricing, SEO
tests/unit/        Vitest
tests/e2e/         Playwright (purchase-flow, admin, accessibility)
docs/              Architecture, brand, IA, admin guide, launch checklist, owner inputs
```

Start with **`docs/ARCHITECTURE.md`** for how the pieces fit together, and
`docs/ADMIN-GUIDE.md` if you are operating the back office.

## 8. Honest limitations

These are known and deliberate for this stage — none of them can be fixed by
writing more code alone:

- **No live supplier.** Only the mock adapter exists; ordering a real eSIM
  requires implementing `SupplierAdapter` against your provider's API.
- **No live payments in this environment.** Stripe is coded and unit-verified
  but has not been run against a real Stripe account here.
- **SQLite, not Postgres.** Fine for a single-instance demo; production should
  switch `datasource.provider` to `postgresql` and create a migration.
  SQLite `contains` filters are case-insensitive where Postgres is
  case-sensitive, so search/ordering results can differ slightly.
- **Rate limiting is database-backed**, which suits a single instance. Behind
  multiple instances, move it to Redis or your platform's limiter.
- **Tax is deliberately zero** with an on-page disclosure. VAT/GST/sales-tax
  handling needs your accountant's decision.
- **Policies are drafts** and must be reviewed by a qualified lawyer in your
  jurisdiction before launch.
- **Analytics is first-party and consent-gated** and stays off until the
  visitor opts in; there are no advertising or cross-site trackers.

## 9. Documentation

| Document | Contents |
| --- | --- |
| `docs/ARCHITECTURE.md` | Stack, data model, order lifecycle, payments, security, configuration |
| `docs/BRAND.md` | Positioning, voice, colour and type tokens, component conventions |
| `docs/INFORMATION-ARCHITECTURE.md` | Every route, navigation, SEO/indexing rules, URL conventions |
| `docs/ADMIN-GUIDE.md` | Staff roles, daily tasks, fulfilment recovery, refunds, logs |
| `docs/LAUNCH-CHECKLIST.md` | 21-point pre-launch checklist with evidence to collect |
| `docs/OWNER-INPUTS.md` | Business, legal and vendor decisions only the owner can make |
