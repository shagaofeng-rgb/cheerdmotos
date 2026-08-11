import {revalidatePath} from 'next/cache';
import {requireAdminApiSession} from '@/lib/adminAuth';
import {appendAuditLog} from '@/lib/adminAudit';
import {getAdminPostById, listAdminPosts, writeAdminStore, type ContentPost, type ContentType, type PublishStatus} from '@/lib/backendStore';
import {recordSitemapContentChange} from '@/lib/sitemapManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function text(formData: FormData, key: string, limit = 1200) {
  return String(formData.get(key) || '').trim().slice(0, limit);
}

function postStatus(value: string): PublishStatus {
  return ['draft', 'published', 'unpublished', 'scheduled', 'archived'].includes(value) ? value as PublishStatus : 'draft';
}

function typeFrom(value: string): ContentType {
  return value === 'news' ? 'news' : 'blog';
}

function tags(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 24);
}

function safeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 140);
}

function postValues(formData: FormData, current: ContentPost | null, type: ContentType, now: string): ContentPost {
  const title = text(formData, 'title', 220);
  const requestedSlug = safeSlug(text(formData, 'slug', 140));
  return {
    id: current?.id || `post-${Date.now()}`,
    type,
    slug: requestedSlug || current?.slug || '',
    title: title || current?.title || '',
    excerpt: text(formData, 'excerpt', 500),
    coverImage: text(formData, 'coverImage', 1200) || current?.coverImage || '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png',
    category: text(formData, 'category', 120) || current?.category || (type === 'news' ? 'Industry News' : 'Product Knowledge'),
    content: text(formData, 'content', 50_000),
    publishDate: text(formData, 'publishDate', 20) || current?.publishDate || now.slice(0, 10),
    author: text(formData, 'author', 120) || current?.author || 'CHEERDMOTO Editorial Team',
    source: text(formData, 'source', 600),
    tags: tags(text(formData, 'tags', 300)),
    seoTitle: text(formData, 'seoTitle', 220) || `${title || current?.title || 'CHEERDMOTO'} | CHEERDMOTO`,
    seoDescription: text(formData, 'seoDescription', 260) || text(formData, 'excerpt', 240),
    status: postStatus(text(formData, 'status', 24)),
    createdAt: current?.createdAt || now,
    updatedAt: now,
    sourceFingerprint: current?.sourceFingerprint,
    contentHash: current?.contentHash,
    sourceName: current?.sourceName,
    sourceUrl: current?.sourceUrl,
    canonicalSourceUrl: current?.canonicalSourceUrl,
    sourcePublishedAt: current?.sourcePublishedAt,
    collectedAt: current?.collectedAt,
    sourceFetchedAt: current?.sourceFetchedAt,
    sourceTimezone: current?.sourceTimezone,
    originalTitle: current?.originalTitle,
    originalLanguage: current?.originalLanguage,
    normalizedTitle: current?.normalizedTitle,
    eventFingerprint: current?.eventFingerprint,
    credibilityScore: current?.credibilityScore,
    productRelations: current?.productRelations,
    productSlugs: current?.productSlugs,
    geoSummary: current?.geoSummary,
    imageAlt: current?.imageAlt,
    imageSourceUrl: current?.imageSourceUrl,
    imageCredit: current?.imageCredit,
    relevanceScore: current?.relevanceScore,
    retryCount: current?.retryCount
  };
}

function redirect(request: Request, type: ContentType, message?: string) {
  const url = new URL(`/admin/${type}`, request.url);
  if (message) url.searchParams.set('error', message);
  return Response.redirect(url, 303);
}

async function audit(request: Request, action: string, detail: string, result: 'success' | 'failed' = 'success') {
  await appendAuditLog({
    actor: 'admin', action, module: 'Blog', result, detail,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'admin-session',
    userAgent: request.headers.get('user-agent') || ''
  });
}

export async function GET(request: Request) {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  const type = new URL(request.url).searchParams.get('type') as ContentType | null;
  return Response.json({posts: await listAdminPosts(type || undefined)});
}

export async function POST(request: Request) {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  const formData = await request.formData();
  const type = typeFrom(text(formData, 'type', 12));
  const intent = text(formData, 'intent', 16) || 'create';
  const id = text(formData, 'id', 180);
  const now = new Date().toISOString();
  const current = id ? await getAdminPostById(id) : null;

  if (intent !== 'create' && !current) {
    await audit(request, '内容管理', `Post not found: ${id}`, 'failed');
    return redirect(request, type, '文章不存在或已被修改');
  }
  if (current && current.type !== type) return redirect(request, type, '文章类型不匹配');

  if (intent === 'archive') {
    await writeAdminStore((store) => ({...store, posts: store.posts.map((post) => post.id === current!.id ? {...post, status: 'archived', updatedAt: now} : post)}));
    await recordSitemapContentChange({type, action: 'archived', slug: current!.slug, title: current!.title});
    await audit(request, '归档文章', `${type}:${current!.slug}`);
    revalidatePath(`/${type}`);
    revalidatePath(`/${type}/${current!.slug}`);
    return redirect(request, type);
  }

  const next = postValues(formData, current, type, now);
  if (!next.title || !next.slug || !next.content) return redirect(request, type, '请填写标题、链接和正文');

  let conflict = false;
  await writeAdminStore((store) => {
    conflict = store.posts.some((post) => post.id !== next.id && post.slug === next.slug);
    if (conflict) return store;
    return {
      ...store,
      posts: current ? store.posts.map((post) => post.id === current.id ? next : post) : [...store.posts, next]
    };
  });
  if (conflict) {
    await audit(request, '内容管理', `Duplicate slug rejected: ${next.slug}`, 'failed');
    return redirect(request, type, '链接 slug 已存在，请换一个');
  }

  await recordSitemapContentChange({type, action: current ? 'updated' : 'created', slug: next.slug, title: next.title});
  await audit(request, current ? '编辑文章' : '新建文章', `${type}:${next.slug}; status=${next.status}`);
  revalidatePath(`/${type}`);
  revalidatePath(`/${type}/${next.slug}`);
  return redirect(request, type);
}
