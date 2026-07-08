import {getAllNewsArticles} from '@/lib/newsFeed';
import {siteUrl} from '@/lib/site';

export const dynamic = 'force-dynamic';

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'}[char] || char));
}

export async function GET() {
  const articles = await getAllNewsArticles();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${articles.map((article) => `  <url>
    <loc>${siteUrl}/news/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>CHEERDMOTO News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${article.date}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>
    <lastmod>${article.updatedAt}</lastmod>
  </url>`).join('\n')}
</urlset>`;
  return new Response(xml, {headers: {'Content-Type': 'application/xml; charset=utf-8'}});
}
