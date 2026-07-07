import {requireAdminApiSession} from '@/lib/adminAuth';
import {listAdminCategories, writeAdminStore} from '@/lib/backendStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function text(formData: FormData, key: string, limit = 240) {
  return String(formData.get(key) || '').trim().slice(0, limit);
}

export async function GET() {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  return Response.json({categories: await listAdminCategories()});
}

export async function POST(request: Request) {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  const formData = await request.formData();
  const now = new Date().toISOString();
  await writeAdminStore((store) => ({
    ...store,
    categories: [
      ...store.categories,
      {
        id: `cat-${Date.now()}`,
        name: text(formData, 'name', 160),
        slug: text(formData, 'slug', 120),
        description: '',
        coverImage: text(formData, 'coverImage', 260),
        seoTitle: text(formData, 'seoTitle', 180),
        seoDescription: '',
        sortOrder: store.categories.length + 1,
        status: 'published',
        parentId: '',
        updatedAt: now
      }
    ]
  }));
  return Response.redirect(new URL('/admin/categories', request.url), 303);
}
