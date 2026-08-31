# Old Code Replacement Status

The removed publisher has been replaced with a dedicated, monitored News pipeline. The following boundaries remain required:

1. Replace combined `/rss.xml` with an isolated News RSS route and a separate Blog RSS route.
2. Replace the shared `ContentPost`-only News automation assumptions with News-specific candidate, run, publication and delivery records.
3. Do not remove `src/lib/newsFeed.ts`, News pages, admin editing, historical News, or the Blog webhook.
4. Keep News Cron authenticated, source allowlisted, idempotent and subject to frontend delivery verification.
