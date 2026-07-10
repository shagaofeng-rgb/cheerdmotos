import {getSitemapIndexEntries, sitemapIndexXml} from '@/lib/sitemapManager';

export const dynamic = 'force-dynamic';

export async function GET() {
  const entries = await getSitemapIndexEntries();
  return new Response(sitemapIndexXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600'
    }
  });
}
