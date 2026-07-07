import path from 'node:path';
import {requireAdminApiSession} from '@/lib/adminAuth';
import {listAdminMedia, writeAdminStore} from '@/lib/backendStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function text(formData: FormData, key: string, limit = 500) {
  return String(formData.get(key) || '').trim().slice(0, limit);
}

export async function GET() {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  return Response.json({media: await listAdminMedia()});
}

export async function POST(request: Request) {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  const formData = await request.formData();
  const url = text(formData, 'url');
  await writeAdminStore((store) => ({
    ...store,
    media: [
      ...store.media,
      {
        id: `media-${Date.now()}`,
        fileName: path.basename(url),
        url,
        alt: text(formData, 'alt', 180),
        mimeType: url.endsWith('.jpg') || url.endsWith('.jpeg') ? 'image/jpeg' : url.endsWith('.webp') ? 'image/webp' : 'image/png',
        sizeBytes: 0,
        usage: text(formData, 'usage', 240).split(',').map((item) => item.trim()).filter(Boolean),
        createdAt: new Date().toISOString()
      }
    ]
  }));
  return Response.redirect(new URL('/admin/media', request.url), 303);
}
