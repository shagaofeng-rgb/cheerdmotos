import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import AdminPagination from '@/components/AdminPagination';
import {paginate, parseAdminPagination} from '@/lib/adminPagination';
import {zhOrderStatus, zhPaymentStatus} from '@/lib/adminZh';
import {getAdminDashboardData} from '@/lib/backendStore';
import {getCommerceSnapshot, readStoreOrders} from '@/lib/commerceStore';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {durableStoreConfigured} from '@/lib/durableStore';

export const dynamic = 'force-dynamic';

function money(value: number) {
  return `USD ${value.toLocaleString()}`;
}

export default async function AdminDashboardPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const timeFilter = parseAdminTimeFilter(params);
  const {page, perPage} = parseAdminPagination(params);
  const [snapshot, backend, allOrders] = await Promise.all([
    getCommerceSnapshot({from: timeFilter.from, to: timeFilter.to}),
    getAdminDashboardData({from: timeFilter.from, to: timeFilter.to}),
    readStoreOrders()
  ]);
  const filteredOrders = allOrders
    .filter((order) => {
      const time = new Date(order.createdAt).getTime();
      if (Number.isNaN(time)) return false;
      if (timeFilter.from && time < timeFilter.from.getTime()) return false;
      if (timeFilter.to && time > timeFilter.to.getTime()) return false;
      return true;
    })
    .slice()
    .reverse();
  const pagedOrders = paginate(filteredOrders, page, perPage);
  const stableCommerceStore = durableStoreConfigured();

  return (
    <AdminShell active="数据总览">
      <div className="admin-title" id="overview">
        <p className="eyebrow">B2B + B2C 后台系统</p>
        <h1>订单、线索、内容与转化数据</h1>
        <p>后台只显示真实采集到的数据：访问事件来自前台埋点，订单来自结账提交，内容来自后台管理数据。</p>
        <AdminTimeFilter action="/admin" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="数据统计时间" summary={timeFilter.summary} />
      </div>

      <div className="admin-metrics">
        <article><span>订单数</span><strong>{snapshot.metrics.orders}</strong><small>客户提交结账后生成</small></article>
        <article><span>待付款</span><strong>{snapshot.metrics.pendingPayment}</strong><small>等待信用卡或 T/T 确认</small></article>
        <article><span>已确认销售额</span><strong>{money(snapshot.metrics.revenue)}</strong><small>已付款/处理中/已发货订单</small></article>
        <article><span>真实访客</span><strong>{snapshot.metrics.visitors}</strong><small>前台匿名访客 ID</small></article>
        <article><span>产品数据</span><strong>{backend.metrics.publishedProducts}/{backend.metrics.products}</strong><small>已发布 / 总数</small></article>
        <article><span>内容数据</span><strong>{backend.metrics.posts}</strong><small>博客与新闻</small></article>
        <article><span>客户线索</span><strong>{backend.metrics.leads}</strong><small>订单 + 结账行为</small></article>
        <article><span>转化率</span><strong>{backend.metrics.conversionRate}%</strong><small>订单 / 独立访客</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">支付接口</p>
          <h2>Oceanpayment 嵌入式支付通道</h2>
          <p>状态：<strong>{snapshot.paymentGateway.status}</strong></p>
        </div>
        <dl className="admin-config-list">
          <div><dt>创建支付</dt><dd>{snapshot.paymentGateway.createEndpoint}</dd></div>
          <div><dt>支付回调</dt><dd>{snapshot.paymentGateway.notifyEndpoint}</dd></div>
          <div><dt>通道</dt><dd>{snapshot.paymentGateway.provider}</dd></div>
          <div><dt>所需变量</dt><dd>OCEANPAYMENT_ACCOUNT, OCEANPAYMENT_CARD_TERMINAL, OCEANPAYMENT_CARD_SECURE_CODE, OCEANPAYMENT_CARD_PUBLIC_KEY, OCEANPAYMENT_WALLET_TERMINAL, OCEANPAYMENT_WALLET_SECURE_CODE, OCEANPAYMENT_WALLET_PUBLIC_KEY</dd></div>
        </dl>
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">同步状态</p>
          <h2>前台与后台实时同步检查</h2>
          <p>后台每次打开都会重新读取订单、访问事件和 CMS 数据，不使用演示数据。</p>
        </div>
        <dl className="admin-config-list">
          <div><dt>访问统计</dt><dd>前台 `/api/analytics/track` 写入，后台“访问统计/数据总览”实时读取。</dd></div>
          <div><dt>订单数据</dt><dd>前台结账 `/api/checkout/create-order` 写入，后台“订单管理/客户管理/线索”实时读取。</dd></div>
          <div><dt>CMS 数据</dt><dd>后台产品、分类、媒体、博客、新闻表单写入后台数据源。</dd></div>
          <div><dt>当前存储</dt><dd>{stableCommerceStore ? '已连接稳定订单库（Vercel Blob / KV / Upstash Redis）' : '临时存储；需要配置 BLOB_READ_WRITE_TOKEN、KV_REST_API_URL + KV_REST_API_TOKEN 或 Upstash Redis REST 凭据'}</dd></div>
        </dl>
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">转化漏斗</p>
          <h2>客户访问路径</h2>
        </div>
        <div className="admin-grid-list">
          {backend.funnel.map((step) => (
            <article key={step.label}>
              <strong>{step.label}</strong>
              <span>{step.value.toLocaleString()} 人/次</span>
              <small>相对上一步 {step.conversion}%</small>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">最新订单</p>
          <h2>订单记录</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>订单号</th><th>日期</th><th>产品</th><th>国家/地区</th><th>金额</th><th>订单状态</th><th>支付状态</th></tr>
            </thead>
            <tbody>
              {pagedOrders.items.length ? pagedOrders.items.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.createdAt.slice(0, 10)}</td>
                  <td>{order.productName} x {order.quantity}</td>
                  <td>{order.customer.country}</td>
                  <td>{money(order.total)}</td>
                  <td>{zhOrderStatus(order.status)}</td>
                  <td>{zhPaymentStatus(order.gatewayStatus)}</td>
                </tr>
              )) : <tr><td colSpan={7}>暂无真实订单数据。</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination basePath="/admin" params={params} page={pagedOrders.page} perPage={pagedOrders.perPage} total={pagedOrders.total} totalPages={pagedOrders.totalPages} />
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">需求信号</p>
          <h2>访问国家与产品需求</h2>
        </div>
        <div className="admin-two-col">
          <div className="admin-bar-list">{backend.countries.length ? backend.countries.map((row) => <p key={row.label}><span>{row.label}</span><strong>{row.value}</strong></p>) : <p><span>暂无真实国家/地区数据</span><strong>0</strong></p>}</div>
          <div className="admin-bar-list">{backend.popularProducts.length ? backend.popularProducts.map((row) => <p key={row.label}><span>{row.label}</span><strong>{row.value}</strong></p>) : <p><span>暂无真实产品需求数据</span><strong>0</strong></p>}</div>
        </div>
      </section>
    </AdminShell>
  );
}
