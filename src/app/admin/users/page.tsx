import AdminShell from '@/components/AdminShell';
import {readAuditLogs} from '@/lib/adminAudit';

export const dynamic = 'force-dynamic';

const roles = [
  ['超级管理员', '全部权限、用户与权限、支付配置、系统设置'],
  ['管理员', '订单、商品、内容、客户、数据查看'],
  ['商品运营', '商品、分类、规格、库存、媒体'],
  ['内容编辑', '新闻、博客、SEO、媒体'],
  ['客服', '订单查看、客户、线索、表单、售后备注'],
  ['仓库', '订单发货、物流、库存查看'],
  ['财务', '支付、退款、订单金额、导出'],
  ['营销', '优惠促销、弃购、客户分组、访问分析'],
  ['只读账号', '只读查看，不可修改']
];

export default async function AdminUsersPage() {
  const logs = await readAuditLogs(20);
  const adminEmail = process.env.ADMIN_EMAIL || 'support@cheerdmotos.com';
  const hasHash = Boolean(process.env.ADMIN_PASSWORD_HASH);

  return (
    <AdminShell active="users">
      <div className="admin-title">
        <p className="eyebrow">用户与权限</p>
        <h1>用户与权限</h1>
        <p>当前后台使用单管理员环境变量登录，并已启用会话 Cookie、登录限流和登录审计。多用户 RBAC 数据表仍需接入数据库后启用。</p>
      </div>

      <div className="admin-metrics">
        <article><span>管理员账号</span><strong>1</strong><small>{adminEmail}</small></article>
        <article><span>密码哈希</span><strong>{hasHash ? '已启用' : '建议启用'}</strong><small>ADMIN_PASSWORD_HASH</small></article>
        <article><span>角色模板</span><strong>{roles.length}</strong><small>按 PDF 权限模型预置</small></article>
        <article><span>最近审计</span><strong>{logs.length}</strong><small>登录与关键操作记录</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">角色模板</p>
          <h2>权限分工建议</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>角色</th><th>权限范围</th></tr>
            </thead>
            <tbody>
              {roles.map(([role, scope]) => <tr key={role}><td>{role}</td><td>{scope}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
