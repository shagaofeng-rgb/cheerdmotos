# Old Code Removal Plan

No active six-hour News publisher exists to remove. The following must be replaced only after the new implementation passes tests:

1. Replace combined `/rss.xml` with an isolated News RSS route and a separate Blog RSS route.
2. Replace the shared `ContentPost`-only News automation assumptions with News-specific candidate, run, publication and delivery records.
3. Do not remove `src/lib/newsFeed.ts`, News pages, admin editing, historical News, or the Blog webhook.
4. Do not enable a News cron until site configuration, sources, writer authorization and production review are complete.
