import AdminShell from '@/components/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  return (
    <AdminShell active="reviews">
      <div className="admin-title">
        <p className="eyebrow">评价管理</p>
        <h1>评价管理</h1>
        <p>评价模块已预留后台入口。当前网站还没有上线前台评价提交入口，所以这里不会伪造评价数据。</p>
      </div>

      <div className="admin-metrics">
        <article><span>待审核</span><strong>0</strong><small>暂无真实评价提交</small></article>
        <article><span>已发布</span><strong>0</strong><small>暂无客户评价库</small></article>
        <article><span>已拒绝</span><strong>0</strong><small>暂无审核记录</small></article>
        <article><span>平均评分</span><strong>-</strong><small>接入后自动统计</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">上线前检查</p>
          <h2>评价功能待接入项</h2>
        </div>
        <dl className="admin-config-list">
          <div><dt>前台入口</dt><dd>需要确认是否允许购买后评价、是否需要图片/视频评价、是否展示评分。</dd></div>
          <div><dt>审核规则</dt><dd>建议评价默认进入待审核，管理员发布后才显示到前台。</dd></div>
          <div><dt>隐私字段</dt><dd>前台展示客户姓名时建议脱敏，例如 David L.。</dd></div>
        </dl>
      </section>
    </AdminShell>
  );
}
