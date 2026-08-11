import crypto from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {appendAuditLog} from '@/lib/adminAudit';
import {writeAdminStore} from '@/lib/backendStore';
import {verifyBlogWebhookApiKey} from '@/lib/blogWebhookAuth';
import {recordSitemapContentChange} from '@/lib/sitemapManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ArticlePayload = {sign: string; classId: string; title: string; content: string; authorId: string; imageUrl: string};

function text(value: unknown, limit: number) { return String(value || '').trim().slice(0, limit); }

function plainText(value: string) {
  return value
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function slugify(value: string) {
  const base = value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return base.slice(0, 96) || 'external-blog-article';
}

function validImageUrl(value: string) {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; } catch { return false; }
}

async function readPayload(request: Request): Promise<ArticlePayload> {
  const contentType = request.headers.get('content-type') || '';
  const raw = contentType.includes('application/json') ? await request.json().catch(() => ({})) : Object.fromEntries(await request.formData().catch(() => new FormData()));
  return {sign: text(raw.sign, 512), classId: text(raw.class_id, 120), title: text(raw.title, 220), content: text(raw.content, 50_000), authorId: text(raw.author_id, 120), imageUrl: text(raw.image_url, 1_200)};
}

function failure(message: string, status = 400) { return Response.json({code: 0, msg: message}, {status}); }

function requestApiKey(request: Request, fallback = '') {
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  return fallback || request.headers.get('x-api-key') || bearer;
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const actor = payload.authorId || 'external-blog-plugin';

  if (!(await verifyBlogWebhookApiKey(requestApiKey(request, payload.sign)))) {
    await appendAuditLog({actor, action: 'Webhook blog publish', module: 'Blog', result: 'failed', ip, userAgent, detail: 'Invalid webhook API key.'});
    return failure('秘钥错误', 401);
  }
  if (!payload.title && !payload.content) return Response.json({code: 1, msg: '验证成功'});
  if (!payload.title || !payload.content) return failure('文章标题和文章内容不能为空');
  if (!validImageUrl(payload.imageUrl)) return failure('封面图地址必须是有效的 http 或 https URL');

  const content = plainText(payload.content);
  if (!content) return failure('文章内容不能为空');
  const fingerprint = crypto.createHash('sha256').update(`${payload.classId}\n${payload.title}\n${content}`).digest('hex');
  const now = new Date().toISOString();
  let publishedSlug = '';
  let duplicate = false;

  try {
    await writeAdminStore((store) => {
      const existing = store.posts.find((post) => post.type === 'blog' && post.sourceFingerprint === fingerprint);
      if (existing) { publishedSlug = existing.slug; duplicate = true; return store; }
      const baseSlug = slugify(payload.title);
      const slug = store.posts.some((post) => post.slug === baseSlug) ? `${baseSlug}-${fingerprint.slice(0, 8)}` : baseSlug;
      publishedSlug = slug;
      const excerpt = content.replace(/\s+/g, ' ').slice(0, 240);
      return {
        ...store,
        posts: [...store.posts, {
          id: `blog-webhook-${Date.now()}-${fingerprint.slice(0, 8)}`,
          type: 'blog', slug, title: payload.title, excerpt,
          coverImage: payload.imageUrl || '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png',
          category: payload.classId || 'blog', content, publishDate: now.slice(0, 10), author: actor,
          source: 'External blog plugin webhook', tags: [payload.classId || 'blog', 'external-plugin'],
          seoTitle: `${payload.title} | CHEERDMOTO`, seoDescription: excerpt.slice(0, 160), sourceName: 'External Blog Plugin', sourceUrl: 'https://www.cheerdmotos.com', sourceFingerprint: fingerprint,
          contentHash: crypto.createHash('sha256').update(content).digest('hex'), imageAlt: `${payload.title} cover image`, imageSourceUrl: payload.imageUrl,
          imageCredit: payload.imageUrl ? 'Provided by external blog plugin.' : 'CHEERDMOTO default product image.', status: 'published', createdAt: now, updatedAt: now
        }]
      };
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 500) : 'Unknown storage failure.';
    await appendAuditLog({actor, action: 'Webhook blog publish', module: 'Blog', result: 'failed', ip, userAgent, detail});
    return failure('文章发布失败，请稍后重试', 500);
  }

  if (!duplicate) {
    await recordSitemapContentChange({type: 'blog', action: 'published', slug: publishedSlug, title: payload.title});
    revalidatePath('/blog');
    revalidatePath(`/blog/${publishedSlug}`);
  }
  await appendAuditLog({actor, action: 'Webhook blog publish', module: 'Blog', result: 'success', ip, userAgent, detail: duplicate ? `Duplicate accepted for ${publishedSlug}.` : `Published ${publishedSlug}.`});
  return Response.json({code: 1, msg: duplicate ? '文章已存在' : '发布成功', slug: publishedSlug});
}

export async function GET(request: Request) {
  const sign = new URL(request.url).searchParams.get('sign') || '';
  if (!(await verifyBlogWebhookApiKey(requestApiKey(request, sign)))) return failure('秘钥错误', 401);
  return Response.json({code: 1, msg: '验证成功'});
}
