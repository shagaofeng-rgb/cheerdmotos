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
  const categorySlug = text(formData, 'categorySlug', 120);
  const slug = text(formData, 'slug', 120);
  const name = text(formData, 'name', 180);
  await writeAdminStore((store) => {
    const category = store.categories.find((item) => item.slug === categorySlug);
    const product: AdminProduct = {
      id: `prod-${Date.now()}`,
      slug,
      name,
      categorySlug,
      categoryName: category?.name || categorySlug,
      coverImage: text(formData, 'coverImage', 260) || '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png',
      galleryImages: text(formData, 'galleryImages', 1200).split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
      shortDescription: text(formData, 'shortDescription', 500),
      fullDescription: text(formData, 'fullDescription', 2000),
      keyFeatures: [],
      specifications: [],
      applicationScenarios: [],
      priceCents: moneyCents(formData, 'compareAtPrice') || moneyCents(formData, 'price'),
      salePriceCents: moneyCents(formData, 'price'),
      currency: 'USD',
      sku: text(formData, 'sku', 100) || `CM-${text(formData, 'slug', 80).toUpperCase()}`,
      stock: Math.max(0, numberValue(formData, 'stock', 0)),
      moq: Math.max(1, numberValue(formData, 'moq', 1)),
      weightDimension: text(formData, 'weightDimension', 220),
      shippingInfo: text(formData, 'shippingInfo', 360),
      seoTitle: text(formData, 'seoTitle', 180) || `${text(formData, 'name', 180)} | CHEERDMOTO`,
      seoDescription: text(formData, 'seoDescription', 320),
      status: publishStatus(text(formData, 'status', 24)),
      sortOrder: Math.max(1, numberValue(formData, 'sortOrder', store.products.length + 1)),
      showOnHome: formData.get('showOnHome') === 'on',
      allowCart: formData.get('allowCart') !== 'off',
      allowDirectOrder: formData.get('allowDirectOrder') !== 'off',
      createdAt: now,
      updatedAt: now
    };
    return {...store, products: [...store.products, product]};
  });
  await recordSitemapContentChange({type: 'product', action: 'created', slug, title: name});
  return Response.redirect(new URL('/admin/products', request.url), 303);
}
