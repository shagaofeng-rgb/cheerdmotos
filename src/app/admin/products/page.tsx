import AdminShell from '@/components/AdminShell';
import {zhPublishStatus} from '@/lib/adminZh';
import {listAdminCategories, listAdminProducts} from '@/lib/backendStore';

export const dynamic = 'force-dynamic';

function usd(cents: number) {
  if (!cents) return '-';
  return `USD ${(cents / 100).toLocaleString()}`;
}

function discount(compareAt: number, sale: number) {
  if (!compareAt || !sale || sale >= compareAt) return '-';
  return `${Math.round(((compareAt - sale) / compareAt) * 100)}%`;
}

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([listAdminProducts(), listAdminCategories()]);

  return (
    <AdminShell active="products">
      <div className="admin-title">
        <p className="eyebrow">Product CMS</p>
        <h1>产品管理</h1>
        <p>按商城站逻辑管理产品草稿、发布状态、SKU、库存、价格、媒体图和 SEO 字段。只有已发布产品才建议同步到前台展示。</p>
      </div>

      <section className="admin-panel admin-guidance-panel">
        <article>
          <span>1</span>
          <strong>保存草稿</strong>
          <p>先录入产品资料、图片、价格、库存和 SEO。</p>
        </article>
        <article>
          <span>2</span>
          <strong>发布产品</strong>
          <p>状态改为已发布后，作为前台展示和商城下单数据。</p>
        </article>
        <article>
          <span>3</span>
          <strong>下架/归档</strong>
          <p>旧产品保留后台数据，但不建议继续展示给客户。</p>
        </article>
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">快速新增</p>
          <h2>新增产品</h2>
        </div>
        <form className="admin-form-grid admin-form-wide" action="/api/admin/products" method="post">
          <input name="name" placeholder="产品名称，例如 CHEERDMOTO X1 Pro Electric Surfboard" required />
          <input name="slug" placeholder="产品链接 slug，例如 x1-pro" required />
          <select name="categorySlug" required>
            {categories.map((category) => <option value={category.slug} key={category.id}>{category.name}</option>)}
          </select>
          <select name="status" defaultValue="draft">
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="unpublished">已下架</option>
            <option value="scheduled">定时发布</option>
            <option value="archived">已归档</option>
          </select>
          <input name="sku" placeholder="SKU / 型号，例如 CM-X1-PRO" />
          <input name="stock" type="number" min="0" step="1" placeholder="库存数量" />
          <input name="price" type="number" min="0" step="1" placeholder="售价 USD" />
          <input name="compareAtPrice" type="number" min="0" step="1" placeholder="原价 / 划线价 USD" />
          <input name="moq" type="number" min="1" step="1" placeholder="MOQ，默认 1" />
          <input name="sortOrder" type="number" min="1" step="1" placeholder="排序权重" />
          <input name="coverImage" placeholder="产品主图路径，例如 https://cdn.shopify.com/s/files/1/0891/6231/8139/files/2.0-6.jpg?v=1739866508&width=1200" />
          <input name="weightDimension" placeholder="重量/尺寸/包装，例如 Export wooden crate by model" />
          <textarea name="galleryImages" placeholder="产品相册图片路径，每行一个，或用英文逗号分隔" />
          <textarea name="shortDescription" placeholder="产品短描述，用于产品卡片和详情页摘要" />
          <textarea name="fullDescription" placeholder="产品详细描述、应用场景、包装说明、交付说明" />
          <textarea name="shippingInfo" placeholder="物流说明，例如 sea freight / air freight / forwarder pickup" />
          <input name="seoTitle" placeholder="SEO Title" />
          <textarea name="seoDescription" placeholder="Meta Description" />
          <label className="admin-check"><input type="checkbox" name="showOnHome" /> 首页推荐</label>
          <label className="admin-check"><input type="checkbox" name="allowCart" defaultChecked /> 允许加入购物/询盘</label>
          <label className="admin-check"><input type="checkbox" name="allowDirectOrder" defaultChecked /> 允许 Buy Now 下单</label>
          <button type="submit">保存产品</button>
        </form>
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">产品数据库</p>
          <h2>{products.length} 条产品记录</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>产品</th><th>分类</th><th>价格</th><th>库存</th><th>媒体</th><th>状态</th><th>SEO</th></tr>
            </thead>
            <tbody>
              {products.length ? products.map((product) => {
                const sale = product.salePriceCents || product.priceCents;
                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong><br />
                      <small>{product.slug} | {product.sku}</small>
                    </td>
                    <td>{product.categoryName}</td>
                    <td>
                      <strong>{usd(sale)}</strong><br />
                      <small>原价 {usd(product.priceCents)} / 折扣 {discount(product.priceCents, sale)}</small>
                    </td>
                    <td>{product.stock}<br /><small>MOQ {product.moq}</small></td>
                    <td>{product.galleryImages.length + (product.coverImage ? 1 : 0)} 张<br /><small>{product.coverImage}</small></td>
                    <td><span className={`admin-status ${product.status}`}>{zhPublishStatus(product.status)}</span></td>
                    <td>{product.seoTitle || '-'}<br /><small>{product.seoDescription || '未填写 Meta Description'}</small></td>
                  </tr>
                );
              }) : <tr><td colSpan={7}>暂无产品数据。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
