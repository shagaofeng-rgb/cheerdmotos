import {getSitemapGroups, sitemapXml} from '@/lib/sitemapManager';

export const dynamic = 'force-dynamic';

export async function GET() {
  const groups = await getSitemapGroups();
  return new Response(sitemapXml(groups.categories), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600'
    }
  });
}
