const localDeliveryHosts = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Vercel invokes Cron routes on an immutable deployment hostname. That hostname
 * can be protected even while the production domains are public, so delivery
 * verification must use the canonical storefront outside local development.
 */
export function newsDeliveryBaseUrl(requestUrl: string, canonicalSiteUrl = 'https://www.cheerdmotos.com') {
  const requested = new URL(requestUrl);
  if (localDeliveryHosts.has(requested.hostname)) return requested.origin;
  return new URL(canonicalSiteUrl).origin;
}
