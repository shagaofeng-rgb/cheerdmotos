# CHEERDMOTO Full-Site Audit Report

**Audit window:** 2026-08-06 09:36-10:00 CST  
**Production target:** https://www.cheerdmotos.com  
**Scope:** source code, Vercel production metadata and logs, Vercel Blob persistence snapshot, public HTTP endpoints, scheduled automation, SEO, and local production build.

## Backup and rollback

- Code/config snapshot and before-state patch: `backups/full-site-audit-20260806-093637/`.
- Production Vercel Blob backup: `backups/full-site-audit-20260806-093637/blob-snapshot/`.
- The Blob manifest has 11 objects and SHA-256 checksums. No production records were deleted or overwritten during backup.
- Rollback: restore the affected source/config files from the backup directory, redeploy the prior Vercel production deployment, and restore Blob files from `blob-snapshot/manifest.json` only after an operator reviews the target object paths.

## Confirmed normal

- Production is a Vercel Next.js project with the three intended domains configured: apex, `www`, and Vercel aliases. The pre-change production deployment was `READY`.
- Blob persistence is configured. The public read-only health endpoint reported `provider=vercel_blob`, `configured=true`, 17 analytics events, and HTTP 200 at 2026-08-06T01:48:00Z.
- Snapshot integrity: 12 products, 4 categories, 12 media records, 67 News posts, 32 Blog posts, all 99 posts published; no duplicate post slugs and no missing required post fields.
- Google Search Console snapshot was `ok`, last synced at 2026-08-05T02:30:32Z, with one sitemap and no stored error.
- News evidence: 63 historical News job records; latest News audit was a successful source-attributed publication at 2026-08-06T00:02:50Z. News audit totals: 35 success and 115 intentional skips from source/deduplication/relevance controls.
- Local production build passed after changes: Next.js generated 146 routes successfully.
- Local regression status codes: `/`, `/news`, `/blog`, sitemap and robots all returned 200; removed Blog cron returned 404; unauthenticated News, sitemap and Google Cron routes returned 401.
- Public production HTTP baseline: `/` 200 / 0.844 s TTFB / 0.922 s total; `/news` 200 / 0.937 s / 1.297 s; `/blog` 200 / 0.672 s / 0.735 s; sitemap, robots, and health all returned 200.
- Vercel 7-day runtime error aggregation reported no grouped runtime errors. Runtime status totals were 2,289 200 responses, 128 404, 17 304, 16 307, and one 500 response.

## Fixed in this release

1. **Blog automatic publishing fully removed.** The production snapshot proved 14 historical Blog automation job logs, including a successful job at 2026-08-06T01:20:13Z. The `publish-blog` Vercel Cron entry, route, and publisher implementation were removed. Existing 32 Blog posts and the authenticated manual Blog posting API remain unchanged. Local route validation confirms the old endpoint now returns 404.
2. **Google proactive submission reduced to one every-three-day path.** The former daily sitemap job submitted to Google whenever the feature flag was enabled, in addition to the daily Google sync. Daily sitemap maintenance now updates sitemap state only. `sync-google-seo` runs at `30 2 */3 * *` UTC and is the only scheduled path that submits the sitemap, then records the Google sync result.
3. **Cron authentication hardened.** Sitemap, Google SEO, and contact-form health-check Cron routes now reject requests in production when `CRON_SECRET` is absent, matching the existing News Cron behavior. Unauthenticated local tests returned 401.
4. **Payment status safety corrected.** The unimplemented Qianhai callback no longer returns a false success; it now returns HTTP 501 with `not_configured` and does not update any order. Oceanpayment simulation additionally requires both the explicit enable flag and a non-empty matching simulation token.
5. **Build isolation corrected.** TypeScript now excludes the local backup directory so retained source backups cannot be compiled as active application routes.

## Active scheduled tasks after change

| Task | Trigger | Frequency | Input/output | Status |
|---|---|---|---|---|
| News publication | `/api/cron/publish-news` | 00:00, 04:00, 16:00, 20:00 UTC | RSS candidates -> validated News posts, audit/job logs, sitemap events | Active; latest recorded publication successful |
| Sitemap maintenance | `/api/cron/sitemap` | 02:45 UTC daily | Current product/content URLs -> sitemap snapshot/run log | Active; no automatic Google submission |
| Google SEO | `/api/cron/sync-google-seo` | 02:30 UTC every 3 calendar days | Sitemap submit + Search Console metrics -> SEO snapshot/run log | Active after deployment |
| Form delivery health test | `/api/cron/test-contact-form` | 02:00 UTC on days 1 and 15 | Real test inquiry -> configured notification email and analytics event | Active |

No Blog cron, queue consumer, workflow, script, or route remains. The four News invocations are intentional: each requests one item and the publisher enforces its daily cap and duplicate checks.

## Findings not safely auto-fixed

- **High: product source-of-truth split.** News and Blog pages read published Blob-backed posts, but product pages, checkout, search, and parts of sitemap generation still use the static catalog in `src/lib/site.ts`. Admin product changes are therefore not a reliable real-time storefront update path. A safe fix requires a staged migration of product/catalog reads to a transactional backend, route revalidation, and a validated catalog migration; it must not be forced against live orders.
- **High: Blob read-modify-write has no transaction/CAS.** Concurrent writes to the same JSON/JSONL object can lose an update. Vercel Blob is working as configured but is not sufficient for transactional commerce writes. Migrate orders, stock, carts, content edits, rate limits, and idempotency keys to KV/Postgres before high-concurrency sales.
- **Medium: rate limiting is process-memory based.** Serverless instances do not share the in-memory map, so global abuse protection needs Vercel WAF or a shared Redis/KV counter.
- **Medium: analytics freshness.** The latest persisted analytics event is 2026-07-31T06:29:39Z. This may be low visitor traffic or tracking inactivity; no fake event was generated. Verify client tracking in a real browser after deployment.
- **Medium: one historic Vercel HTTP 500 exists in the 7-day aggregate.** Vercel’s wide-range log query timed out before returning its path. The runtime-error aggregator reported no cluster. Narrow the time range or use the Vercel dashboard request ID if it recurs.
- **Not available to inspect:** Vercel server CPU, memory, disk, process table, database tables/indexes, queue brokers, and CDN internals are not exposed to this project/API. This deployment uses serverless functions and Blob storage, not a directly reachable database server.

## Evidence and regression record

- Source/config scan: `rg` found no remaining `publish-blog` route or publisher after the change.
- Production Blob snapshot was taken before edits; manifest timestamp is 2026-08-06T01:41:42Z.
- Build command: `npm run build` completed successfully after the backup exclusion.
- Public endpoint checks used read-only `curl` requests. No order, payment, post, Blog, or content record was created or deleted during validation.
- Deployment verification must be repeated against the new Vercel production deployment after this commit is deployed; record the deployment ID and the same endpoint status checks below this report.
