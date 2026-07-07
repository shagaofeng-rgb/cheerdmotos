'use client';

import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';

type RealtimePayload = {
  ok: boolean;
  generatedAt: string;
  version: string;
  state: {
    orders: number;
    events: number;
    leads: number;
    latestOrder: string;
    latestEvent: string;
  };
  store?: {
    configured: boolean;
    provider: string;
  };
};

function timeLabel(value: string) {
  if (!value) return '暂无同步';
  return new Date(value).toLocaleTimeString('zh-CN', {hour12: false});
}

export default function AdminRealtimeSync() {
  const router = useRouter();
  const firstVersion = useRef('');
  const [payload, setPayload] = useState<RealtimePayload | null>(null);
  const [status, setStatus] = useState<'syncing' | 'online' | 'updated' | 'offline'>('syncing');

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function sync() {
      try {
        const response = await fetch('/api/admin/realtime', {
          cache: 'no-store',
          credentials: 'include'
        });
        if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
        const next = (await response.json()) as RealtimePayload;
        if (cancelled) return;

        setPayload(next);
        if (!firstVersion.current) {
          firstVersion.current = next.version;
          setStatus('online');
        } else if (firstVersion.current !== next.version) {
          firstVersion.current = next.version;
          setStatus('updated');
          router.refresh();
          window.setTimeout(() => {
            if (!cancelled) setStatus('online');
          }, 1600);
        } else {
          setStatus('online');
        }
      } catch {
        if (!cancelled) setStatus('offline');
      } finally {
        if (!cancelled) timer = window.setTimeout(sync, 8000);
      }
    }

    sync();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [router]);

  const label = status === 'updated' ? '数据已更新' : status === 'offline' ? '同步中断' : status === 'syncing' ? '正在同步' : '实时同步';

  return (
    <div className={`admin-realtime-sync ${status}`} aria-live="polite">
      <span className="admin-sync-dot" />
      <div>
        <strong>{label}</strong>
        <small>
          订单 {payload?.state.orders ?? 0} / 线索 {payload?.state.leads ?? 0} / 事件 {payload?.state.events ?? 0}
          {' '} / {payload?.store?.configured ? '稳定存储' : '临时存储'}
          {' '} / 最近 {timeLabel(payload?.state.latestOrder || payload?.state.latestEvent || payload?.generatedAt || '')}
        </small>
      </div>
    </div>
  );
}
