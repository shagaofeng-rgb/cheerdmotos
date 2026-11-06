import AdminShell from '@/components/AdminShell';
import {listAdminProducts} from '@/lib/backendStore';
import AdminPagination from '@/components/AdminPagination';
import {paginate, parseAdminPagination} from '@/lib/adminPagination';
import {readStoreOrders} from '@/lib/commerceStore';
import {stockBreakdown} from '@/lib/inventory';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const [catalog, orders, params] = await Promise.all([listAdminProducts(), readStoreOrders(), searchParams]);
  const products = catalog.map((product) => ({...product, ...stockBreakdown(product, orders)}));
  const {page, perPage} = parseAdminPagination(params);
  const pagedProducts = paginate(products, page, perPage);
  const totalStock = products.reduce((sum, product) => sum + product.available, 0);
  const lowStock = products.filter((product) => product.available > 0 && product.available <= 5);
  const outOfStock = products.filter((product) => product.available === 0);
  const sellable = products.filter((product) => product.status === 'published' && (product.allowCart || product.allowDirectOrder) && product.available > 0);

  return (
    <AdminShell active="inventory">
      <div className="admin-title">
        <p className="eyebrow">库存管理</p>
        <h1>库存管理</h1>
        <p>可售库存等于盘点库存扣除未过期预留和盘点后已付款件数。盘点时录入当前实物可售量，先扣除已付款待发货商品。</p>
      </div>

      <div className="admin-metrics">
        <article><span>可售库存</span><strong>{totalStock}</strong><small>所有商品可售件数合计</small></article>
        <article><span>可售商品</span><strong>{sellable.length}</strong><small>已发布、可下单且有库存</small></article>
        <article><span>低库存</span><strong>{lowStock.length}</strong><small>库存 1-5 件</small></article>
        <article><span>缺货商品</span><strong>{outOfStock.length}</strong><small>库存为 0 或负数</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">库存清单</p>
          <h2>商品库存状态</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>SKU</th><th>商品</th><th>分类</th><th>可售库存</th><th>MOQ</th><th>可购物车</th><th>可直接下单</th><th>更新时间</th></tr>
            </thead>
            <tbody>
              {pagedProducts.items.length ? pagedProducts.items.map((product) => (
                <tr key={product.id}>
                  <td>{product.sku || product.slug}</td>
                  <td><strong>{product.name}</strong><br /><small>{product.slug}</small></td>
                  <td>{product.categoryName}</td>
                  <td><strong className={product.available <= 5 ? 'admin-danger-text' : undefined}>{product.available}</strong><br /><small>盘点 {product.stock} · 预留 {product.reserved} · 已付款 {product.sold}</small></td>
                  <td>{product.moq}</td>
                  <td>{product.allowCart ? '是' : '否'}</td>
                  <td>{product.allowDirectOrder ? '是' : '否'}</td>
                  <td>{product.updatedAt.slice(0, 10)}</td>
                </tr>
              )) : <tr><td colSpan={8}>暂无商品库存数据。</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination basePath="/admin/inventory" params={params} page={pagedProducts.page} perPage={pagedProducts.perPage} total={pagedProducts.total} totalPages={pagedProducts.totalPages} />
      </section>
    </AdminShell>
  );
}
