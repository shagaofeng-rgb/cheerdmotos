import AdminShell from '@/components/AdminShell';
import {readAuditLogs} from '@/lib/adminAudit';

export const dynamic = 'force-dynamic';

export default async function AdminAuditLogsPage() {
  const logs = await readAuditLogs(200);
  const failed = logs.filter((log) => log.result === 'failed');
  const actors = new Set(logs.map((log) => log.actor)).size;

  return (
    <AdminShell active="audit-logs">
      <div className="admin-title">
        <p className="eyebrow">操作日志</p>
        <h1>操作日志</h1>
        <p>记录后台登录和关键操作，后续退款、导出、支付配置、权限变更等高风险行为也应统一写入这里。</p>
      </div>

      <div className="admin-metrics">
        <article><span>日志总数</span><strong>{logs.length}</strong><small>最近 200 条</small></article>
        <article><span>失败操作</span><strong>{failed.length}</strong><small>登录失败或被限流</small></article>
        <article><span>账号数</span><strong>{actors}</strong><small>出现过的操作者</small></article>
        <article><span>审计存储</span><strong>JSONL</strong><small>随持久化存储保存</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">最近日志</p>
          <h2>后台操作记录</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>时间</th><th>账号</th><th>模块</th><th>操作</th><th>结果</th><th>IP</th><th>说明</th></tr>
            </thead>
            <tbody>
              {logs.length ? logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.createdAt.slice(0, 16).replace('T', ' ')}</td>
                  <td>{log.actor}</td>
                  <td>{log.module}</td>
                  <td>{log.action}</td>
                  <td>{log.result === 'success' ? '成功' : '失败'}</td>
                  <td>{log.ip || '-'}</td>
                  <td>{log.detail}</td>
                </tr>
              )) : <tr><td colSpan={7}>暂无操作日志。登录后台后会自动产生记录。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
