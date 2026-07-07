import {ADMIN_PAGE_SIZES, pageHref} from '@/lib/adminPagination';

export default function AdminPagination({
  basePath,
  params,
  page,
  perPage,
  total,
  totalPages
}: {
  basePath: string;
  params: Record<string, string | string[] | undefined>;
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}) {
  return (
    <div className="admin-pagination">
      <div>
        <strong>共 {total} 条</strong>
        <span>第 {page} / {totalPages} 页</span>
      </div>
      <nav aria-label="分页">
        <a className={`button secondary small ${page <= 1 ? 'is-disabled' : ''}`} href={pageHref(basePath, params, {page: Math.max(1, page - 1), perPage})}>上一页</a>
        <a className={`button secondary small ${page >= totalPages ? 'is-disabled' : ''}`} href={pageHref(basePath, params, {page: Math.min(totalPages, page + 1), perPage})}>下一页</a>
      </nav>
      <form action={basePath} method="get">
        {Object.entries(params).map(([key, value]) => {
          if (key === 'page' || key === 'perPage') return null;
          if (Array.isArray(value)) return value.map((item) => item ? <input key={`${key}-${item}`} name={key} type="hidden" value={item} /> : null);
          return value ? <input key={key} name={key} type="hidden" value={value} /> : null;
        })}
        <input name="page" type="hidden" value="1" />
        <label>
          <span>每页</span>
          <select name="perPage" defaultValue={perPage}>
            {ADMIN_PAGE_SIZES.map((size) => <option key={size} value={size}>{size} 条</option>)}
          </select>
        </label>
        <button type="submit">应用</button>
      </form>
    </div>
  );
}
