# New Site Migration Playbook (Refactor + Journal + Timeweb)

## 1) Product scope (based on approved requirements)

You are building a new site by reusing the current platform architecture with these additions:

1. Standard publications from parsing sources (as now).
2. A separate **Journal Issues page** (not a feed column), similar to magazine archive pages.
3. A dedicated admin section for journal publishing.
4. A header link to the journal page.
5. A homepage banner linking to the journal page.
6. The homepage banner must show the **latest journal cover automatically**.
7. Admin must support uploading a JPEG cover for each issue.

---

## 2) Current system map (what we keep, what we refactor)

### Ingestion pipeline (existing)
- Sources are stored in `Source` with adapter config and per-source scrape intervals.
- Scraping is started by cron endpoints and by manual admin actions.
- Ingested articles are created with `INGESTED` status, then AI-processed to `DRAFT`, then scheduled/published.

### Existing strengths to preserve
- Adapter strategy (`rss`, `playwright/html`) for source extensibility.
- Good article lifecycle states (`INGESTED`, `PROCESSING`, `DRAFT`, `SCHEDULED`, `PUBLISHED`, `FAILED`).
- S3-compatible image pipeline + fallback.
- Docker build flow already production-oriented for Next.js standalone.

### High-risk points to fix during migration
1. **Auth cookie mismatch risk**
   - Session cookie is `nucmed_session`, but middleware checks `session_token`.
2. **Security boundary risk in source management**
   - Source APIs and ingestion triggers need stricter server-side auth boundaries.
3. **Cron portability risk**
   - `vercel.json` cron config does not run on Timeweb automatically.
4. **Long-running coupling risk**
   - Ingestion and processing are partially chained and can run long in request lifecycle.

---

## 3) Target architecture for the new site

Use 4 bounded domains/modules:

1. **Ingestion Domain**
   - Source registry, adapters, deduplication, source health, scrape schedules.
2. **Editorial Domain**
   - Article processing, moderation, scheduling, publishing.
3. **Magazine Domain (new)**
   - Journal issues, issue assets (cover JPEG, optional PDF/link), issue visibility, latest issue selection.
4. **Distribution Domain**
   - Homepage composition, newsletter notifications, SEO, click/impression analytics.

### Key refactor rule
Keep domain logic in `lib/*` services (use-case style), and keep route handlers thin (validation/auth/orchestration only).

---

## 4) Data model design for Journal (new)

## Proposed Prisma model

```prisma
model JournalIssue {
  id               String   @id @default(cuid())
  slug             String   @unique
  title            String
  issueNumber      String?
  publicationDate  DateTime
  description      String?

  coverImageUrl    String   // required JPEG in admin flow
  coverAlt         String?

  landingUrl       String?  // external or internal issue page/pdf
  pdfUrl           String?

  isPublished      Boolean  @default(false)
  isFeatured       Boolean  @default(true) // candidate for homepage banner

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([isPublished, publicationDate])
  @@index([isFeatured, publicationDate])
  @@map("journal_issues")
}
```

### Why this design
- `publicationDate` is the authoritative ordering field for “latest issue”.
- `isPublished` controls public visibility.
- `isFeatured` allows temporary exclusion from banner without deleting issue.
- `coverImageUrl` is required so homepage banner never renders empty.

---

## 5) Frontend behavior contract

## Header
- Add `Журнал` link in desktop + mobile navigation.

## Homepage banner
- Query latest issue with:
  - `isPublished = true`
  - `isFeatured = true`
  - max `publicationDate`
- Render cover + CTA (“Смотреть выпуски журнала”).
- On no issue: hide banner cleanly (no layout break).

## Journal page
- Route: `/journal` (or `/magazines`; pick one canonical route and keep redirects).
- List issues by publication date descending.
- Card fields: cover, title, issue number, date, short description, open/read button.

---

## 6) Admin UX design for Journal

Create `/admin/journal` with:
1. List table/cards of issues.
2. Create/edit form.
3. JPEG upload for cover.
4. Publish/unpublish toggle.
5. Feature toggle for homepage banner.
6. Optional external URL/PDF URL.

Validation rules:
- Cover: `image/jpeg` only (or allow png/webp with automatic conversion to jpeg/webp, but store final normalized format).
- File size limit (e.g., 10MB).
- Required fields: `title`, `publicationDate`, `coverImageUrl`.

---

## 7) Parsing sources: professional update strategy

## 7.1 Source contract hardening
For each source, define a versioned contract:
- `adapterType`
- selectors/fields
- canonical URL extraction rule
- externalId strategy
- fallback behavior

Store contract version in `Source.adapterConfig.version`.

## 7.2 Safe source update flow (mandatory)
When changing a source config:
1. Run **test scrape preview** (N newest entries, no DB write).
2. Show parsed sample (title/url/date/image) in admin.
3. Save only if preview quality threshold is met.
4. Enable source with new config.

## 7.3 Observability per source
Track and display:
- last success time
- stale interval breach
- duplicate ratio
- parse error ratio
- median scrape duration

Define health statuses: `healthy`, `degraded`, `stale`, `broken`.

## 7.4 Concurrency and idempotency
- Keep `@@unique([sourceId, externalId])` as hard dedupe barrier.
- Add idempotent ingest request IDs for manual reruns.
- For async jobs, use lease/lock pattern to avoid overlapping runs per source.

---

## 8) Timeweb deployment blueprint

## Runtime
- Deploy as **backend Docker app** (existing Dockerfile is suitable baseline).
- Keep Next.js standalone build.

## Required environment groups
1. **Core**: `NODE_ENV`, `NEXT_PUBLIC_SITE_URL`, `PORT`.
2. **Database**: `DATABASE_URL`, `DIRECT_URL`.
3. **Auth**: `ADMIN_API_KEY`, session-related secrets.
4. **Ingestion/Cron**: `INGEST_API_KEY`, `CRON_SECRET`.
5. **AI**: replicate/model keys.
6. **Storage**: S3 endpoint, bucket, access, secret, prefix.

## Cron on Timeweb
Because Vercel cron config is not native on Timeweb, configure scheduled HTTP calls in Timeweb (or external scheduler) to:
- `/api/cron/scrape`
- `/api/cron/process`
- `/api/cron/publish`
- `/api/cron/digest`

Use secure headers (`Authorization` or `x-api-key`) and fixed source IP policy if available.

## Deployment sequence
1. Build + deploy container.
2. Run Prisma migration (`migrate deploy` in release step or one-time job).
3. Smoke tests (health, auth, list pages, ingest endpoint auth).
4. Enable cron schedules.
5. Monitor first 24h with alert thresholds.

---

## 9) Migration execution plan (phased)

## Phase A — Foundation
- Fix auth boundary inconsistencies.
- Freeze current behavior with baseline E2E and API contract snapshots.

## Phase B — Magazine domain
- Add `JournalIssue` schema + migrations.
- Add admin CRUD + cover upload.
- Add public `/journal` page.

## Phase C — Homepage integration
- Add latest issue query service.
- Add homepage banner + header link.
- Add fallback rendering and caching strategy.

## Phase D — Source management hardening
- Add preview scrape endpoint.
- Add source contract versioning + validation.
- Add source-level SLO metrics in admin.

## Phase E — Timeweb rollout
- Provision app + envs + migrations.
- Configure scheduled jobs.
- Validate ingestion/publish cycles end-to-end.

## Phase F — Cutover and stabilization
- DNS switch.
- Observe 48h.
- Execute rollback if SLO breach.

---

## 10) Quality gates (Definition of Done)

A release is done only if:
1. All journal flows pass (admin create/edit/publish + public page + homepage latest banner).
2. No open admin endpoint without auth.
3. Source preview works before saving config changes.
4. Cron jobs run on Timeweb with verified logs.
5. Rollback plan tested at least once in staging.
6. Lighthouse/SEO checks for homepage and journal page are acceptable.

---

## 11) What else to account for (often missed)

1. **Content rights** for journal covers/PDF assets.
2. **SEO canonical strategy** (`/journal` vs `/magazines`, avoid duplicates).
3. **Image lifecycle** (old cover cleanup policy, storage costs).
4. **Backup policy** for DB + object storage.
5. **Rate-limit policy** for ingestion and AI calls.
6. **Incident runbook** for parser breakages.

---

## 12) Master prompt for implementation AI (copy/paste)

```text
You are a principal software architect and staff-level fullstack engineer.
Your task is to execute a production-grade migration to a new medical news site based on an existing Next.js + Prisma platform.

Business requirements:
1) Keep regular source-parsed publications.
2) Add a dedicated Journal Issues page (not an inline column).
3) Add separate admin section for journal issues.
4) Add header navigation link to journal.
5) Add homepage banner linking to journal.
6) Homepage banner must automatically show latest published journal cover.
7) Admin must support JPEG cover upload for each issue.

Mandatory engineering constraints:
- Preserve existing ingestion pipeline behavior while refactoring.
- Keep strict auth boundaries on all admin/source endpoints.
- Keep idempotent ingestion and dedup by sourceId+externalId.
- Separate domain logic from route handlers (thin API handlers).
- Add robust validation (zod) and explicit API contracts.
- Add migration scripts and backward-compatible rollout plan.
- Provide observability hooks for source health and cron reliability.
- Do not rely on Vercel-only cron; produce Timeweb-compatible scheduling plan.

Technical stack constraints:
- Next.js App Router
- Prisma + PostgreSQL
- Docker standalone runtime
- S3-compatible object storage

Expected deliverables (in order):
A. Architecture decision record (ADR) for Journal domain and source refactor.
B. Prisma schema migration for JournalIssue.
C. Admin API + admin UI for journal CRUD and cover upload.
D. Public journal page + homepage latest-issue banner + header link.
E. Source update hardening: preview scrape, versioned adapter config, health metrics.
F. Timeweb deployment checklist + cron setup + smoke tests.
G. Regression test plan (API + integration + E2E critical paths).

Definition of done:
- Journal end-to-end flow works.
- No unauthorized admin/source mutation endpoints.
- Timeweb deployment reproducible from a single runbook.
- Clear rollback strategy documented.

When coding:
- Start with an explicit plan and risk list.
- Implement in small PR-sized steps.
- For each step provide: changed files, why, API contract, test evidence.
- Prefer minimal safe refactors over broad rewrites.
```
