import AdminPagination from '@/components/AdminPagination';
import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import {paginate, parseAdminPagination} from '@/lib/adminPagination';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {readAuditLogs} from '@/lib/adminAudit';

export const dynamic = 'force-dynamic';

export default async function AdminAuditLogsPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>;}) {
  const params = await searchParams;
  const timeFilter = parseAdminTimeFilter(params);
  const {page, perPage} = parseAdminPagination(params);
  const logs = (await readAuditLogs(5000)).filter((log) => { const time = new Date(log.createdAt).getTime(); return time >= timeFilter.from.getTime() && time <= timeFilter.to.getTime(); });
  const failed = logs.filter((log) => log.result === 'failed');
  const actors = new Set(logs.map((log) => log.actor)).size;
  const pagedLogs = paginate(logs, page, perPage);
  return <AdminShell active="audit-logs"><div className="admin-title"><p className="eyebrow">操作日志</p><h1>操作日志</h1><p>记录后台登录和关键操作。退款、导出、支付配置和权限变更应统一写入这里。</p><AdminTimeFilter action="/admin/audit-logs" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="操作发生时间" summary={timeFilter.summary} /></div><div className="admin-metrics"><article><span>日志总数</span><strong>{logs.length}</strong><small>所选时间范围</small></article><article><span>失败操作</span><strong>{failed.length}</strong><small>登录失败或被限流</small></article><article><span>账号数</span><strong>{actors}</strong><small>出现过的操作者</small></article><article><span>审计存储</span><strong>JSONL</strong><small>随持久化存储保存</small></article></div><section className="admin-panel"><div><p className="eyebrow">操作明细</p><h2>后台操作记录</h2></div><div className="admin-table-wrap"><table><thead><tr><th>时间</th><th>账号</th><th>模块</th><th>操作</th><th>结果</th><th>IP</th><th>说明</th></tr></thead><tbody>{pagedLogs.items.length ? pagedLogs.items.map((log) => <tr key={log.id}><td>{log.createdAt.slice(0, 16).replace('T', ' ')}</td><td>{log.actor}</td><td>{log.module}</td><td>{log.action}</td><td>{log.result === 'success' ? '成功' : '失败'}</td><td>{log.ip || '-'}</td><td>{log.detail}</td></tr>) : <tr><td colSpan={7}>所选时间暂无操作日志。</td></tr>}</tbody></table></div><AdminPagination basePath="/admin/audit-logs" params={params} page={pagedLogs.page} perPage={pagedLogs.perPage} total={pagedLogs.total} totalPages={pagedLogs.totalPages} /></section></AdminShell>;
}
