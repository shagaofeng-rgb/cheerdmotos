import {requireAdminApiSession} from '@/lib/adminAuth';
import {listAdminProducts, writeAdminStore, type AdminProduct} from '@/lib/backendStore';
import {recordSitemapContentChange} from '@/lib/sitemapManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function text(formData: FormData, key: string, limit = 240) {
  return String(formData.get(key) || '').trim().slice(0, limit);
}

function moneyCents(formData: FormData, key: string) {
  return Math.max(0, Math.round(Number(text(formData, key, 24) || 0) * 100));
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(text(formData, key, 24));
  return Number.isFinite(value) ? value : fallback;
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
  const {response} = await requireAdminApiSession();
  if (response) return response;
  const formData = await request.formData();
  const now = new Date().toISOString();
  const intent = text(formData, 'intent', 16) || 'create';
  const id = text(formData, 'id', 180);
  const categorySlug = text(formData, 'categorySlug', 120);
  const slug = text(formData, 'slug', 120);
  const name = text(formData, 'name', 180);
  let missing = false;
  await writeAdminStore((store) => {
    const existing = intent === 'update' ? store.products.find((item) => item.id === id) : null;
    if (intent === 'update' && !existing) {
      missing = true;
      return store;
    }
    const category = store.categories.find((item) => item.slug === categorySlug);
    const product: AdminProduct = {
      id: existing?.id || `prod-${Date.now()}`,
      slug: slug || existing?.slug || '',
      name: name || existing?.name || '',
      categorySlug: categorySlug || existing?.categorySlug || '',
      categoryName: category?.name || existing?.categoryName || categorySlug,
      coverImage: text(formData, 'coverImage', 260) || existing?.coverImage || '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png',
      galleryImages: text(formData, 'galleryImages', 1200).split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).length ? text(formData, 'galleryImages', 1200).split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean) : existing?.galleryImages || [],
      shortDescription: text(formData, 'shortDescription', 500) || existing?.shortDescription || '',
      fullDescription: text(formData, 'fullDescription', 2000) || existing?.fullDescription || '',
      keyFeatures: existing?.keyFeatures || [],
      specifications: existing?.specifications || [],
      applicationScenarios: existing?.applicationScenarios || [],
      priceCents: moneyCents(formData, 'compareAtPrice') || moneyCents(formData, 'price') || existing?.priceCents || 0,
      salePriceCents: moneyCents(formData, 'price') || existing?.salePriceCents || 0,
      currency: 'USD',
      sku: text(formData, 'sku', 100) || existing?.sku || `CM-${text(formData, 'slug', 80).toUpperCase()}`,
      stock: Math.max(0, numberValue(formData, 'stock', existing?.stock || 0)),
      moq: Math.max(1, numberValue(formData, 'moq', existing?.moq || 1)),
      weightDimension: text(formData, 'weightDimension', 220) || existing?.weightDimension || '',
      shippingInfo: text(formData, 'shippingInfo', 360) || existing?.shippingInfo || '',
      seoTitle: text(formData, 'seoTitle', 180) || existing?.seoTitle || `${text(formData, 'name', 180)} | CHEERDMOTO`,
      seoDescription: text(formData, 'seoDescription', 320) || existing?.seoDescription || '',
      status: publishStatus(text(formData, 'status', 24)),
      sortOrder: Math.max(1, numberValue(formData, 'sortOrder', existing?.sortOrder || store.products.length + 1)),
      showOnHome: formData.has('showOnHome') ? formData.get('showOnHome') === 'on' : existing?.showOnHome || false,
      allowCart: formData.has('allowCart') ? formData.get('allowCart') !== 'off' : existing?.allowCart || false,
      allowDirectOrder: formData.has('allowDirectOrder') ? formData.get('allowDirectOrder') !== 'off' : existing?.allowDirectOrder || false,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    return {...store, products: existing ? store.products.map((item) => item.id === existing.id ? product : item) : [...store.products, product]};
  });
  if (missing) return Response.redirect(new URL('/admin/products?error=product-not-found', request.url), 303);
  await recordSitemapContentChange({type: 'product', action: intent === 'update' ? 'updated' : 'created', slug, title: name});
  return Response.redirect(new URL('/admin/products', request.url), 303);
}
