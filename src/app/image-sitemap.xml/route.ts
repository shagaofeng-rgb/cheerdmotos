import {getAllBlogArticles} from '@/lib/blogFeed';
import {getAllNewsArticles} from '@/lib/newsFeed';
import {siteData, siteUrl} from '@/lib/site';

export const dynamic = 'force-dynamic';

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'}[char] || char));
}

function absoluteImage(url: string) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${siteUrl}${url}`;
}

export async function GET() {
  const [news, blogs] = await Promise.all([getAllNewsArticles(), getAllBlogArticles()]);
  const rows = [
    ...siteData.products.map((item) => ({loc: item.route, image: item.image, title: item.title})),
    ...news.map((item) => ({loc: `/news/${item.slug}`, image: item.hero, title: item.heroAlt || item.title})),
    ...blogs.map((item) => ({loc: `/blog/${item.slug}`, image: item.hero, title: item.heroAlt || item.title}))
  ].filter((row) => row.image);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${rows.map((row) => `  <url>
    <loc>${siteUrl}${row.loc}</loc>
    <image:image>
      <image:loc>${absoluteImage(row.image)}</image:loc>
      <image:title>${escapeXml(row.title)}</image:title>
    </image:image>
  </url>`).join('\n')}
</urlset>`;
  return new Response(xml, {headers: {'Content-Type': 'application/xml; charset=utf-8'}});
}
