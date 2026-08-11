# SEO Indexation Baseline

- `/news`: existing dynamic list route.
- `/news/[slug]`: existing dynamic detail route with canonical and Open Graph metadata.
- `/news-sitemap.xml`: existing News URL output.
- `/rss.xml`: currently mixes News and Blog and is non-compliant with the target isolation rule.
- `sitemap-posts.xml`: currently includes both published News and Blog by design.
- No historical News has been removed, redirected, or set to noindex during this audit.

Before any historical cleanup, record each exact URL, source completeness, duplicate cluster and rollback object reference.
