const supportedPublicLocales = new Set<string>();

export function normalizePublicLocale(locale: unknown) {
  const normalized = String(locale || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');
  return supportedPublicLocales.has(normalized) ? normalized : '';
}

export function localizedPublicPath(locale: unknown, route: string) {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  const normalizedLocale = normalizePublicLocale(locale);
  return normalizedLocale ? `/${normalizedLocale}${normalizedRoute}` : normalizedRoute;
}
