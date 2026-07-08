import AdminShell from '@/components/AdminShell';
import {listAdminProducts} from '@/lib/backendStore';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  const products = await listAdminProducts();
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
  const lowStock = products.filter((product) => product.stock > 0 && product.stock <= 5);
  const outOfStock = products.filter((product) => product.stock <= 0);
  const sellable = products.filter((product) => product.status === 'published' && product.allowCart && product.stock > 0);

  return (
    <AdminShell active="inventory">
      <div className="admin-title">
        <p className="eyebrow">库存管理</p>
        <h1>库存管理</h1>
        <p>根据后台商品库实时汇总库存、可售状态、低库存和缺货商品。后续接入仓库系统后，这里会显示库存流水、锁定库存和出入库记录。</p>
      </div>

      <div className="admin-metrics">
        <article><span>总库存</span><strong>{totalStock}</strong><small>所有商品库存合计</small></article>
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
              <tr><th>SKU</th><th>商品</th><th>分类</th><th>库存</th><th>MOQ</th><th>可购物车</th><th>可直接下单</th><th>更新时间</th></tr>
            </thead>
            <tbody>
              {products.length ? products.map((product) => (
                <tr key={product.id}>
                  <td>{product.sku || product.slug}</td>
                  <td><strong>{product.name}</strong><br /><small>{product.slug}</small></td>
                  <td>{product.categoryName}</td>
                  <td>{product.stock <= 5 ? <strong className="admin-danger-text">{product.stock}</strong> : product.stock}</td>
                  <td>{product.moq}</td>
                  <td>{product.allowCart ? '是' : '否'}</td>
                  <td>{product.allowDirectOrder ? '是' : '否'}</td>
                  <td>{product.updatedAt.slice(0, 10)}</td>
                </tr>
              )) : <tr><td colSpan={8}>暂无商品库存数据。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
