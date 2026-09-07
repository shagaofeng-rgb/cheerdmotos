import Link from 'next/link';
import {paginationPages, storefrontHref, type SearchParams} from '@/lib/storefrontPagination';

type StorefrontPaginationProps = {
  pathname: string;
  params?: SearchParams;
  page: number;
  totalPages: number;
  start: number;
  end: number;
  total: number;
  label: string;
};

export default function StorefrontPagination({pathname, params = {}, page, totalPages, start, end, total, label}: StorefrontPaginationProps) {
  if (total <= 0) return null;
  const pageHref = (nextPage: number) => storefrontHref(pathname, params, {page: nextPage === 1 ? undefined : nextPage});

  return (
    <nav className="storefront-pagination" aria-label={`${label} pagination`}>
      <p>Showing {start}-{end} of {total}</p>
      {totalPages > 1 ? (
        <div className="storefront-pagination-controls">
          {page > 1 ? <Link href={pageHref(page - 1)} scroll={false}>Previous</Link> : <span aria-disabled="true">Previous</span>}
          <div className="storefront-page-numbers">
            {paginationPages(page, totalPages).map((entry, index) => entry === 'ellipsis' ? (
              <span className="storefront-page-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
            ) : (
              <Link href={pageHref(entry)} scroll={false} key={entry} aria-current={entry === page ? 'page' : undefined}>{entry}</Link>
            ))}
          </div>
          {page < totalPages ? <Link href={pageHref(page + 1)} scroll={false}>Next</Link> : <span aria-disabled="true">Next</span>}
        </div>
      ) : null}
    </nav>
  );
}
