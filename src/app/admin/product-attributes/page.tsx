import AdminShell from '@/components/AdminShell';
import {listAdminProducts} from '@/lib/backendStore';

export const dynamic = 'force-dynamic';

export default async function AdminProductAttributesPage() {
  const products = await listAdminProducts();
  const specs = products.flatMap((product) => product.specifications.map((spec) => ({
    product: product.name,
    sku: product.sku,
    label: spec.label,
    value: spec.value
  })));
  const featureCount = products.reduce((sum, product) => sum + product.keyFeatures.length, 0);

  return (
    <AdminShell active="product-attributes">
      <div className="admin-title">
        <p className="eyebrow">商品属性与规格</p>
        <h1>商品属性与规格</h1>
        <p>集中检查商品参数、卖点和规格字段，避免前台详情页、SEO 文案和购物车展示出现不一致。</p>
      </div>

      <div className="admin-metrics">
        <article><span>商品数</span><strong>{products.length}</strong><small>后台商品库</small></article>
        <article><span>规格项</span><strong>{specs.length}</strong><small>已录入参数</small></article>
        <article><span>卖点项</span><strong>{featureCount}</strong><small>商品核心特性</small></article>
        <article><span>缺少规格</span><strong>{products.filter((product) => product.specifications.length === 0).length}</strong><small>需要补充详情</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">规格表</p>
          <h2>当前商品规格</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>商品</th><th>SKU</th><th>规格名称</th><th>规格值</th></tr>
            </thead>
            <tbody>
              {specs.length ? specs.map((spec, index) => (
                <tr key={`${spec.sku}-${spec.label}-${index}`}>
                  <td>{spec.product}</td>
                  <td>{spec.sku}</td>
                  <td>{spec.label}</td>
                  <td>{spec.value}</td>
                </tr>
              )) : <tr><td colSpan={4}>暂无规格数据。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
