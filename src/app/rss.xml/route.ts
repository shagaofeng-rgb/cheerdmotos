import {getAllBlogArticles} from '@/lib/blogFeed';
import {getAllNewsArticles} from '@/lib/newsFeed';
import {siteUrl} from '@/lib/site';

export const dynamic = 'force-dynamic';

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'}[char] || char));
}

export async function GET() {
  const [news, blogs] = await Promise.all([getAllNewsArticles(), getAllBlogArticles()]);
  const items = [...news.map((item) => ({...item, path: `/news/${item.slug}`})), ...blogs.map((item) => ({...item, path: `/blog/${item.slug}`}))]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>CHEERDMOTO News and Blog</title>
    <link>${siteUrl}</link>
    <description>Source-attributed news and buying guides from CHEERDMOTO.</description>
    ${items.map((item) => `<item>
      <title>${escapeXml(item.title)}</title>
      <link>${siteUrl}${item.path}</link>
      <guid>${siteUrl}${item.path}</guid>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      <description>${escapeXml(item.excerpt)}</description>
    </item>`).join('\n')}
  </channel>
</rss>`;
  return new Response(xml, {headers: {'Content-Type': 'application/rss+xml; charset=utf-8'}});
}
