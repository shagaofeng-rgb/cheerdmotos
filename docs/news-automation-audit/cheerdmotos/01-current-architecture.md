# Current Architecture

- Site ID: `cheerdmotos`
- Domain: `https://www.cheerdmotos.com`
- Framework: Next.js App Router on Vercel.
- Durable content store: `cheerdmoto-commerce/admin-store.json` in Vercel Blob.
- News and Blog currently use distinct `type` values (`news` and `blog`) in the same `posts` array. Queries in `src/lib/newsFeed.ts` and `src/lib/blogFeed.ts` filter by type.
- News routes: `/news`, `/news/[slug]`, `/news-sitemap.xml`.
- Blog routes: `/blog`, `/blog/[slug]`.
- The current `/rss.xml` mixes News and Blog and therefore does not satisfy the required News/Blog RSS isolation.
- No News ingest, candidate store, source registry, publication state machine, distributed lock, delivery check, or alert subsystem currently exists.
- Prior News automation was deliberately removed; `/api/cron/publish-news` is absent.

This audit is configuration-neutral. No production setting has been changed.
