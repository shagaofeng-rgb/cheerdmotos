export type SearchParams = Record<string, string | string[] | undefined>;

export const STOREFRONT_PAGE_SIZE = 12;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function readPage(value: string | string[] | undefined) {
  const parsed = Number(firstValue(value) || 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export function readParam(value: string | string[] | undefined) {
  return firstValue(value)?.trim() || '';
}

export function paginateItems<T>(items: readonly T[], requestedPage: number, pageSize = STOREFRONT_PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    totalPages,
    start: total ? start + 1 : 0,
    end: Math.min(start + pageSize, total)
  };
}

export function storefrontHref(pathname: string, params: SearchParams, next: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (key === 'page') return;
    if (Array.isArray(value)) value.forEach((entry) => entry && search.append(key, entry));
    else if (value) search.set(key, value);
  });
  Object.entries(next).forEach(([key, value]) => {
    if (value === undefined || value === '') search.delete(key);
    else search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function paginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({length: totalPages}, (_, index) => index + 1);
  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) pages.push('ellipsis');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}
