import {createHash} from 'node:crypto';
import {requireAdminApiSession} from '@/lib/adminAuth';
import {readAdminStore} from '@/lib/backendStore';
import {readStoreOrders} from '@/lib/commerceStore';
import {readContactInquiries} from '@/lib/contactInquiries';
import {durableStoreStatus} from '@/lib/durableStore';
import {readGoogleSeoSnapshot} from '@/lib/googleSeo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function latest(values: string[]) {
  return values.reduce((newest, value) => value > newest ? value : newest, '');
}

export async function GET() {
  const {response, session} = await requireAdminApiSession('signed_in');
  if (response) return response;
  const admin = session.role === 'admin';
  const support = session.role === 'support';
  const [store, orders, inquiries, google] = await Promise.all([
    readAdminStore(),
    admin || support ? readStoreOrders() : [],
    admin || support ? readContactInquiries() : [],
    admin ? readGoogleSeoSnapshot() : null
  ]);
  const forms = inquiries.filter((inquiry) => !inquiry.test);
  const updates = [
    {label: '商品', latest: latest(store.products.map((product) => product.updatedAt))},
    ...(admin || support ? [
      {label: '订单', latest: latest(orders.map((order) => order.updatedAt || order.createdAt))},
      {label: '询盘', latest: latest(forms.map((form) => form.createdAt))},
      {label: '通知', latest: latest(forms.map((form) => form.delivery.attemptedAt)),
        note: `待处理 ${forms.filter((form) => form.delivery.status !== 'sent').length} 条`}
    ] : []),
    ...(admin ? [
      {label: '内容', latest: latest(store.posts.map((post) => post.updatedAt))},
      {label: 'Google', latest: google?.status === 'ok' ? google.syncedAt : '',
        note: google?.status === 'error' ? '同步失败' : google?.status === 'not_configured' ? '待配置' : ''}
    ] : [])
  ];

  return Response.json({
    generatedAt: new Date().toISOString(),
    version: createHash('sha256').update(JSON.stringify(updates)).digest('hex').slice(0, 16),
    persistent: durableStoreStatus().configured,
    updates
  }, {headers: {'Cache-Control': 'private, no-store'}});
}
