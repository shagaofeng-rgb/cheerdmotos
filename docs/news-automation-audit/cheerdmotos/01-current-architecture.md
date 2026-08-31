# Current Architecture

- Site ID: `cheerdmotos`
- Domain: `https://www.cheerdmotos.com`
- Framework: Next.js App Router on Vercel.
- Durable content store: `cheerdmoto-commerce/admin-store.json` in Vercel Blob.
- News and Blog currently use distinct `type` values (`news` and `blog`) in the same `posts` array. Queries in `src/lib/newsFeed.ts` and `src/lib/blogFeed.ts` filter by type.
- News routes: `/news`, `/news/[slug]`, `/news-sitemap.xml`.
- Blog routes: `/blog`, `/blog/[slug]`.
- The current `/rss.xml` mixes News and Blog and therefore does not satisfy the required News/Blog RSS isolation.
- News ingest, candidate/run/publication/delivery records, provider-aware distributed locks, delivery checks and failure alerts are implemented in the dedicated News automation modules.
- `/api/cron/publish-news` is the authenticated News-only worker. It never calls the Blog webhook.

The production implementation is governed by `docs/news-automation.md` and the environment variables documented in `.env.example`.
