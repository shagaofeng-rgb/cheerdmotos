'use client';

import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';

type RealtimePayload = {
  generatedAt: string;
  version: string;
  persistent: boolean;
  updates: {label: string; latest: string; note?: string}[];
};

const shanghaiTime = new Intl.DateTimeFormat('zh-CN', {timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false});

function timeLabel(value: string) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? '暂无记录' : shanghaiTime.format(timestamp);
}

export default function AdminRealtimeSync() {
  const router = useRouter();
  const displayedVersion = useRef('');
  const [payload, setPayload] = useState<RealtimePayload | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let timer = 0;
    async function sync() {
      try {
        if (document.hidden) return;
        const response = await fetch('/api/admin/realtime', {cache: 'no-store', signal: controller.signal});
        if (!response.ok) throw new Error('Unable to read sync status');
        const next = await response.json() as RealtimePayload;
        if (!displayedVersion.current) displayedVersion.current = next.version;
        setPayload(next);
        setOffline(false);
      } catch {
        if (!controller.signal.aborted) setOffline(true);
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(sync, 30_000);
      }
    }
    void sync();
    return () => {controller.abort(); window.clearTimeout(timer);};
  }, []);

  const changed = Boolean(payload && displayedVersion.current !== payload.version);
  const label = offline ? '数据读取失败' : !payload ? '正在检查数据' : changed ? '有新数据' : '数据连接正常';
  return <div className={`admin-realtime-sync ${offline ? 'offline' : 'online'}`}>
    <span className="admin-sync-dot" aria-hidden="true" />
    <div>
      <strong role="status">{label}</strong>
      <small>{payload ? `${payload.persistent ? '持久化存储' : '本地或临时存储'} · 北京时间 ${timeLabel(payload.generatedAt)}` : '等待后端状态'}</small>
      {payload && <small>{payload.updates.map((source) => `${source.label} ${source.note || timeLabel(source.latest)}`).join(' · ')}</small>}
    </div>
    {changed && <button type="button" onClick={() => { displayedVersion.current = payload?.version || ''; router.refresh(); }}>刷新数据</button>}
  </div>;
}
