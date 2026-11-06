import AdminShell from '@/components/AdminShell';
import {readAuditLogs} from '@/lib/adminAudit';
import {adminRoleCounts, requireAdminPageSession} from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const roles = [
  ['admin', '主管理员', '全部权限，含退款、导出与系统设置'],
  ['support', '客服', '查看订单与线索，处理表单通知'],
  ['inventory', '库存查看', '查看总览和库存'],
  ['read_only', '只读账号', '查看总览、库存和同步状态']
] as const;

export default async function AdminUsersPage() {
  await requireAdminPageSession('users');
  const configured = adminRoleCounts();
  const logs = await readAuditLogs(20);
  const adminEmail = process.env.ADMIN_EMAIL || 'info@cheerdmotos.com';
  const hasHash = Boolean(process.env.ADMIN_PASSWORD_HASH);

  return (
    <AdminShell active="users">
      <div className="admin-title">
        <p className="eyebrow">用户与权限</p>
        <h1>用户与权限</h1>
        <p>后台按账号分配访问范围。退款、导出和系统设置由主管理员处理。员工账号由部署配置启用。</p>
      </div>

      <div className="admin-metrics">
        <article><span>管理员账号</span><strong>1</strong><small>{adminEmail}</small></article>
        <article><span>密码哈希</span><strong>{hasHash ? '已启用' : '建议启用'}</strong><small>ADMIN_PASSWORD_HASH</small></article>
        <article><span>已配置员工账号</span><strong>{configured.reduce((sum, role) => sum + role.count, 0)}</strong><small>按角色限制页面和接口</small></article>
        <article><span>最近审计</span><strong>{logs.length}</strong><small>登录与关键操作记录</small></article>
      </div>

      <section className="admin-panel">
        <div>

          <h2>角色与权限</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>角色</th><th>权限范围</th><th>已配置账号</th></tr>
            </thead>
            <tbody>
              {roles.map(([key, role, scope]) => <tr key={key}><td>{role}</td><td>{scope}</td><td>{key === 'admin' ? 1 : configured.find((item) => item.role === key)?.count || 0}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
