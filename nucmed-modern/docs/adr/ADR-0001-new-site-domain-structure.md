---
title: ADR-0001 New Site Domain Structure
status: accepted
date: 2026-02-14
authors:
  - Principal Architect / Staff Fullstack
---

# ADR-0001: New Site Domain Structure (Ingestion / Editorial / Magazine / Distribution)

## Context

Current platform already contains working ingestion, editorial publication states, admin workflows, and cron routes, but domain boundaries are mixed:

- Ingestion orchestration and dedup are implemented in scraper service and API routes (`sourceId + externalId` uniqueness is enforced at DB level).
- Editorial operations are split across article APIs and AI processing endpoints.
- Source management and mutations have uneven server-side auth protection.
- Cron model currently includes Vercel-specific scheduling metadata, but runtime target is Docker/Timeweb.

Evidence in current codebase:

- Dedup boundary in schema: `@@unique([sourceId, externalId])` on `Article` in `prisma/schema.prisma`.
- Ingestion write path: `lib/scraper/index.ts` creates articles and handles duplicate collisions.
- Public source mutation endpoint exists without auth: `app/api/sources/[id]/route.ts` (`PATCH`).
- Admin mutation endpoints without auth exist: `app/api/admin/users/route.ts` (`POST`), `app/api/admin/users/[id]/route.ts` (`PATCH`, `DELETE`), `app/api/admin/settings/route.ts` (`PATCH`), `app/api/admin/stats/route.ts` (unprotected admin data).
- Session cookie mismatch exists: session cookie is `nucmed_session` in auth routes, while middleware checks `session_token`.

## Decision

We standardize architecture into 4 explicit domains:

1. **Ingestion Domain**
   - Source registry, adapter execution, scrape preview, source config versioning, source health, ingest idempotency.
   - Owns: source contracts, scrape run metrics, ingestion orchestration.

2. **Editorial Domain**
   - Article moderation, AI processing, scheduling, publication transitions.
   - Owns: article lifecycle, manual content edits, publication rules.

3. **Magazine Domain** (new)
   - Journal issue CRUD, cover upload (JPEG input), publication and featured selection.
   - Owns: latest published issue and homepage banner selection contract.

4. **Distribution Domain**
   - Homepage assembly, journal banner rendering, newsletter and external distribution triggers.
   - Owns: read models for public pages, cache invalidation policies, outbound publishing hooks.

## Boundary Rules

### Route handlers are thin

Route handlers only do:

- authentication/authorization
- request/response validation via Zod
- orchestration call into domain service
- mapping domain errors to HTTP status

Domain services do all business logic and DB transactions.

### Contracts

Each mutable endpoint must have:

- `InputSchema` (Zod)
- `OutputSchema` (Zod)
- explicit error shape (`{ error: string, code?: string, details?: unknown }`)

### Security

- All admin and source mutation routes require server-side auth (`session` OR admin API key).
- No mutation auth decisions in client components.
- Middleware cookie must match `SESSION_COOKIE_NAME`.

## Data Flow (authoritative paths)

### Ingestion

`Source` -> adapter scrape -> normalized scraped article -> dedup check (`sourceId + externalId`) -> `Article(INGESTED)` -> optional AI processing.

Authoritative dedup source: database unique index on `Article(sourceId, externalId)`.

### Editorial

`Article(INGESTED)` -> `PROCESSING` -> `DRAFT` -> (`SCHEDULED` | `PUBLISHED` | `FAILED`).

Authoritative publication state: `Article.status`.

### Magazine (new)

`JournalIssue` admin mutation -> persisted issue with cover URL -> publish toggle -> public read model (`latestPublishedIssue`, `journalIssueList`).

Authoritative banner source: latest `JournalIssue` where `isPublished=true` and `isFeatured=true`, ordered by `publicationDate desc`.

### Distribution

Public pages query domain read services, not raw API route composition logic.

## Storage and Media Strategy

- JPEG upload accepted from admin for issue covers.
- Stored object can be normalized to webp/jpeg in object storage.
- DB stores canonical URL and metadata required for rendering.
- Keep S3-compatible abstraction (no provider lock-in).

## Observability Strategy

### Ingestion/source

Track per source:

- last success timestamp
- scrape duration
- fetched/new/duplicate/error counters
- error ratio and duplicate ratio
- derived health (`healthy`, `degraded`, `stale`, `broken`)

### Cron

Track per cron route:

- started/finished timestamps
- processed counts
- failures
- max duration breaches
- retry count

Persist summary to DB logs and emit structured logs.

## Rollout Strategy (Backward-Compatible)

1. Add Magazine schema + migrations without changing existing article flows.
2. Add magazine admin API/UI behind authenticated routes.
3. Add public journal route and homepage banner with graceful empty-state fallback.
4. Harden source/admin mutation auth and cookie consistency.
5. Add source preview + versioned adapter config.
6. Add metrics and runbook for Timeweb scheduled HTTP jobs.

No destructive changes to existing ingestion path during rollout.

## Timeweb Compatibility Decision

Vercel cron config is retained only as optional metadata.

Production scheduling contract is HTTP-triggered cron jobs from Timeweb (or external scheduler) to:

- `/api/cron/scrape`
- `/api/cron/process`
- `/api/cron/publish`
- `/api/cron/digest`

All routes require secure server-side secret (`Authorization: Bearer <CRON_SECRET>` and/or `x-api-key`).

## Consequences

### Positive

- Explicit ownership reduces coupling and regression risk.
- Magazine feature can be shipped without ingest pipeline rewrite.
- Security boundaries become testable and auditable.
- Timeweb deployment becomes deterministic.

### Trade-offs

- Additional service and schema files increase short-term complexity.
- Initial refactor requires endpoint contract standardization.

## Non-Goals

- Rewriting existing ingestion adapters from scratch.
- Replacing Prisma or Next.js runtime model.
- Building queue infrastructure in this migration wave.

## Acceptance Checks

- Existing ingest dedup behavior preserved.
- All admin/source mutation endpoints server-auth protected.
- Journal flow works end-to-end (create/edit/publish/render/banner).
- Timeweb runbook can deploy and rollback from one document.
