import Link from 'next/link';
import {notFound} from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import {zhBrowser, zhCountry, zhDeviceName, zhTrafficPlatform, zhTrafficSource} from '@/lib/adminLabels';
import {zhEventType} from '@/lib/adminZh';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {getVisitorJourney} from '@/lib/visitorRecords';

export const dynamic = 'force-dynamic';

function dateTime(value: string) { return value ? value.slice(0, 19).replace('T', ' ') : '-'; }

export default async function VisitorDetailPage({params, searchParams}: {params: Promise<{customerNo: string}>; searchParams: Promise<Record<string, string | string[] | undefined>>;}) {
  const [{customerNo}, query] = await Promise.all([params, searchParams]);
  const timeFilter = parseAdminTimeFilter(query);
  const visitor = await getVisitorJourney(customerNo, {from: timeFilter.from, to: timeFilter.to});
  if (!visitor) notFound();
  return (
    <AdminShell active="visitors">
      <div className="admin-title">
        <p className="eyebrow">访客客户详情</p>
        <h1>{visitor.customerNo}</h1>
        <p>同一匿名客户的真实访问会话、路径与转化信号。IP 仅展示脱敏结果。</p>
        <AdminTimeFilter action={`/admin/visitors/${visitor.customerNo}`} range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="访问详情时间" summary={timeFilter.summary} />
        <div className="admin-actions"><Link className="button secondary small" href={`/admin/visitors?range=${timeFilter.range}&start=${timeFilter.start}&end=${timeFilter.end}`}>返回访客列表</Link></div>
      </div>
      <div className="admin-metrics">
        <article><span>客户标签</span><strong>{visitor.customerTag}</strong><small>自动归属</small></article>
        <article><span>会话数</span><strong>{visitor.sessions}</strong><small>{visitor.visitDays} 个访问日</small></article>
        <article><span>页面浏览</span><strong>{visitor.pageViews}</strong><small>所选时间范围</small></article>
        <article><span>最近来源</span><strong>{zhTrafficPlatform(visitor.sourcePlatform)}</strong><small>{zhTrafficSource(visitor.source)}</small></article>
      </div>
      <section className="admin-panel"><div className="admin-two-col"><dl className="admin-config-list"><div><dt>首次访问</dt><dd>{dateTime(visitor.firstSeen)}</dd></div><div><dt>最近访问</dt><dd>{dateTime(visitor.lastSeen)}</dd></div><div><dt>国家/地区</dt><dd>{zhCountry(visitor.country)}</dd></div><div><dt>脱敏 IP</dt><dd>{visitor.ip || '-'}</dd></div></dl><dl className="admin-config-list"><div><dt>设备 / 浏览器</dt><dd>{zhDeviceName(visitor.device)} / {zhBrowser(visitor.browser)}</dd></div><div><dt>来源详情</dt><dd>{visitor.sourceDetail}</dd></div><div><dt>最近页面</dt><dd>{visitor.lastPage}</dd></div><div><dt>稳定归属</dt><dd>匿名访客 ID + 会话 + 归因关联</dd></div></dl></div></section>
      <section className="admin-panel"><div><p className="eyebrow">访问路径</p><h2>按会话查看访问旅程</h2></div><div className="admin-table-wrap"><table><thead><tr><th>会话</th><th>开始 / 结束</th><th>来源</th><th>页面路径</th><th>事件数</th></tr></thead><tbody>{visitor.journeys.length ? visitor.journeys.map((journey) => <tr key={journey.sessionId}><td>{journey.sessionId.slice(-12)}</td><td>{dateTime(journey.startedAt)}<br /><small>{dateTime(journey.endedAt)}</small></td><td>{journey.source}</td><td>{journey.pages.join(' → ') || '-'}</td><td>{journey.events.length}</td></tr>) : <tr><td colSpan={5}>所选时间没有访问路径。</td></tr>}</tbody></table></div></section>
      <section className="admin-panel"><div><p className="eyebrow">行为明细</p><h2>完整访问事件</h2></div><div className="admin-table-wrap"><table><thead><tr><th>时间</th><th>事件</th><th>页面</th><th>页面标题</th></tr></thead><tbody>{visitor.events.map((event) => <tr key={event.id}><td>{dateTime(event.timestamp)}</td><td>{zhEventType(event.type)}</td><td>{event.page}</td><td>{event.pageTitle || '-'}</td></tr>)}</tbody></table></div></section>
    </AdminShell>
  );
}
