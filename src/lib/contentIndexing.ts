import type {ContentPost} from '@/lib/backendStore';

export type ContentIndexingDecision = {
  indexable: boolean;
  reason: string;
  wordCount: number;
};

const AUTO_GENERATED_TITLE = /\bwhat\s+(?:electric\s+mobility\s+)?buyers\s+should\b/i;
const HTML_ENTITY = /&(?:#\d+|#x[\da-f]+|[a-z]+);/i;

function words(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function sourceUrl(post: ContentPost) {
  return post.canonicalSourceUrl || post.sourceUrl || post.source.match(/https?:\/\/\S+/)?.[0] || '';
}

function isInternalUrl(value: string) {
  try {
    return new URL(value).hostname.endsWith('cheerdmotos.com');
  } catch {
    return false;
  }
}

/** Keeps public history online while removing thin or unreviewed imports from sitemaps. */
export function getContentIndexingDecision(post: ContentPost): ContentIndexingDecision {
  const wordCount = words(post.content);

  if (post.seoIndexing === 'index') return {indexable: true, reason: 'editor-approved', wordCount};
  if (post.seoIndexing === 'noindex') return {indexable: false, reason: 'editor-noindex', wordCount};
  if (post.status !== 'published' && post.status !== 'scheduled') return {indexable: false, reason: 'not-public', wordCount};
  if (!post.title || !post.excerpt || !post.seoTitle || !post.seoDescription) return {indexable: false, reason: 'missing-seo-fields', wordCount};
  if (AUTO_GENERATED_TITLE.test(post.title) || HTML_ENTITY.test(post.title)) return {indexable: false, reason: 'legacy-template-title', wordCount};

  const source = sourceUrl(post);
  if (post.type === 'news') {
    if (!post.sourceName || !source || !post.originalTitle || !post.sourcePublishedAt) {
      return {indexable: false, reason: 'incomplete-news-attribution', wordCount};
    }
    if (isInternalUrl(source)) return {indexable: false, reason: 'news-source-is-not-independent', wordCount};
    if (wordCount < 700) return {indexable: false, reason: 'news-below-editorial-minimum', wordCount};
    return {indexable: true, reason: 'source-attributed-news', wordCount};
  }

  if (source && !isInternalUrl(source)) return {indexable: false, reason: 'blog-has-external-source', wordCount};
  if (wordCount < 600) return {indexable: false, reason: 'blog-below-editorial-minimum', wordCount};
  return {indexable: true, reason: 'original-long-form-blog', wordCount};
}
