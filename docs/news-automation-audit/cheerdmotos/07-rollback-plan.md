# Rollback Plan

- Source backup: `backups/news-automation-audit-20260811-120000/source-pre-news-audit-099d734.zip`.
- Source revision: `099d734`.
- Existing durable data backup remains under `backups/full-audit-20260811-090000/blob/`.
- Before enabling any News worker, create a new Blob object mirror and record its manifest.
- Roll back code with `git revert` of the specific News automation commits. Do not reset shared history.
- Restore only the specific affected Blob objects from the mirror; do not overwrite later order, form, product, Blog, or News data.
