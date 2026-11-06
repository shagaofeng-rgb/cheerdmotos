import {requireAdminApiSession} from '@/lib/adminAuth';
import {listAdminProducts, writeAdminStore, type AdminProduct} from '@/lib/backendStore';
import {recordSitemapContentChange} from '@/lib/sitemapManager';
import {appendAuditLog} from '@/lib/adminAudit';
import {persistentWritesAvailable, withStoreLock} from '@/lib/durableStore';
import {ORDER_WRITE_LOCK, ORDER_WRITE_OPTIONS} from '@/lib/inventory';
import {isSpecialPayment} from '@/lib/purchaseCatalog';
import {clientIp} from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function text(formData: FormData, key: string, limit = 240) {
  return String(formData.get(key) || '').trim().slice(0, limit);
}

function moneyCents(formData: FormData, key: string) {
  return Math.max(0, Math.round(numberValue(formData, key) * 100));
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const input = text(formData, key, 24);
  if (!input) return fallback;
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function checkbox(formData: FormData, key: string, previous = false) {
  return formData.has(key) ? formData.getAll(key).includes('on') : previous;
}

function publishStatus(value: string): AdminProduct['status'] {
  return ['draft', 'published', 'unpublished', 'scheduled', 'archived'].includes(value) ? value as AdminProduct['status'] : 'draft';
}

export async function GET() {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  return Response.json({products: await listAdminProducts()});
}

export async function POST(request: Request) {
  const {response, session} = await requireAdminApiSession();
  if (response) return response;
  if (!persistentWritesAvailable()) return Response.json({message: '持久化存储未配置'}, {status: 503});
  const formData = await request.formData();
  const now = new Date().toISOString();
  const intent = text(formData, 'intent', 16) || 'create';
  const id = text(formData, 'id', 180);
  const categorySlug = text(formData, 'categorySlug', 120);
  const slug = text(formData, 'slug', 120);
  const name = text(formData, 'name', 180);
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(slug) || isSpecialPayment(slug)) {
    return Response.redirect(new URL('/admin/products?error=invalid-slug', request.url), 303);
  }
  let error = '';
  await withStoreLock(ORDER_WRITE_LOCK, () => writeAdminStore((store) => {
    const existing = intent === 'update' ? store.products.find((item) => item.id === id) : null;
    if (intent === 'update' && !existing) {
      error = 'product-not-found';
      return store;
    }
    if (store.products.some((item) => item.slug === slug && item.id !== existing?.id)) {
      error = 'duplicate-slug';
      return store;
    }
    const category = store.categories.find((item) => item.slug === categorySlug);
    const stock = Math.max(0, Math.trunc(numberValue(formData, 'stock', existing?.stock || 0)));
    const product: AdminProduct = {
      id: existing?.id || `prod-${Date.now()}`,
      slug: slug || existing?.slug || '',
      name: name || existing?.name || '',
      categorySlug: categorySlug || existing?.categorySlug || '',
      categoryName: category?.name || existing?.categoryName || categorySlug,
      coverImage: formData.has('coverImage') ? text(formData, 'coverImage', 260) : existing?.coverImage || '',
      galleryImages: text(formData, 'galleryImages', 1200).split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).length ? text(formData, 'galleryImages', 1200).split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean) : existing?.galleryImages || [],
      shortDescription: text(formData, 'shortDescription', 500) || existing?.shortDescription || '',
      fullDescription: text(formData, 'fullDescription', 2000) || existing?.fullDescription || '',
      keyFeatures: existing?.keyFeatures || [],
      specifications: existing?.specifications || [],
      applicationScenarios: existing?.applicationScenarios || [],
      priceCents: formData.has('compareAtPrice') ? moneyCents(formData, 'compareAtPrice') || moneyCents(formData, 'price') : existing?.priceCents || moneyCents(formData, 'price'),
      salePriceCents: formData.has('price') ? moneyCents(formData, 'price') : existing?.salePriceCents || 0,
      currency: 'USD',
      sku: text(formData, 'sku', 100) || existing?.sku || `CM-${text(formData, 'slug', 80).toUpperCase()}`,
      stock,
      stockCountedAt: !existing || stock !== existing.stock || formData.get('recountStock') === 'on' ? new Date().toISOString() : existing.stockCountedAt,
      moq: Math.max(1, numberValue(formData, 'moq', existing?.moq || 1)),
      weightDimension: text(formData, 'weightDimension', 220) || existing?.weightDimension || '',
      shippingInfo: text(formData, 'shippingInfo', 360) || existing?.shippingInfo || '',
      seoTitle: text(formData, 'seoTitle', 180) || existing?.seoTitle || `${text(formData, 'name', 180)} | COWIN`,
      seoDescription: text(formData, 'seoDescription', 320) || existing?.seoDescription || '',
      status: publishStatus(text(formData, 'status', 24)),
      sortOrder: Math.max(1, numberValue(formData, 'sortOrder', existing?.sortOrder || store.products.length + 1)),
      showOnHome: checkbox(formData, 'showOnHome', existing?.showOnHome),
      allowCart: checkbox(formData, 'allowCart', existing?.allowCart),
      allowDirectOrder: checkbox(formData, 'allowDirectOrder', existing?.allowDirectOrder),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    return {...store, products: existing ? store.products.map((item) => item.id === existing.id ? product : item) : [...store.products, product]};
  }), ORDER_WRITE_OPTIONS);
  await appendAuditLog({actor: session.email, action: '保存商品', module: '商品管理', result: error ? 'failed' : 'success',
    ip: clientIp(request), userAgent: request.headers.get('user-agent') || '', detail: `${slug} ${error || intent}`});
  if (error) return Response.redirect(new URL(`/admin/products?error=${error}`, request.url), 303);
  await recordSitemapContentChange({type: 'product', action: intent === 'update' ? 'updated' : 'created', slug, title: name});
  return Response.redirect(new URL('/admin/products', request.url), 303);
}
