export const newsDisplayImagePool = [
  {url: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png', publisher: 'COWIN', note: 'COWIN product image.'},
  {url: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xtreme_transparent.png', publisher: 'COWIN', note: 'COWIN product image.'},
  {url: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xplus_transparent.png', publisher: 'COWIN', note: 'COWIN product image.'},
  {url: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/smart_b02_transparent.png', publisher: 'COWIN', note: 'COWIN product image.'}
] as const;

const supportedRemoteNewsImages = new Set(['laikegeo.oss-cn-shanghai.aliyuncs.com']);

export function resolveNewsDisplayImage(post: {coverImage?: string; productSlugs?: string[]}) {
  const coverImage = post.coverImage?.trim() || '';
  if (coverImage.startsWith('/') && !coverImage.startsWith('//') && !/^\/favicon\.ico(?:$|[?#])/i.test(coverImage)) {
    return coverImage;
  }
  try {
    const parsed = new URL(coverImage);
    if (parsed.protocol === 'https:' && supportedRemoteNewsImages.has(parsed.hostname) && parsed.pathname.startsWith('/uploads/')) {
      return parsed.toString();
    }
  } catch {
    // Invalid and legacy image values use a stable COWIN-owned fallback.
  }
  const related = (post.productSlugs?.[0] || '').toLowerCase();
  const index = related.includes('xtreme') ? 1 : related.includes('xplus') ? 2 : related.includes('smart') ? 3 : 0;
  return newsDisplayImagePool[index].url;
}
