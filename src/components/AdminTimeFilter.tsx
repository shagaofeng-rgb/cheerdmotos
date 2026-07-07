'use client';

import {useRef, useState} from 'react';

type AdminTimeFilterProps = {
  action: string;
  range: string;
  start: string;
  end: string;
  label: string;
  summary: string;
};

const quickRanges = [
  {value: 'day', label: '今天'},
  {value: 'week', label: '本周'},
  {value: 'month', label: '本月'},
  {value: 'year', label: '今年'}
];

export default function AdminTimeFilter({action, range, start, end, label, summary}: AdminTimeFilterProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedRange, setSelectedRange] = useState(range);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function submitSoon() {
    setIsSubmitting(true);
    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  function applyQuickRange(value: string) {
    setSelectedRange(value);
    setIsSubmitting(true);
    window.location.assign(`${action}?range=${encodeURIComponent(value)}`);
  }

  return (
    <form ref={formRef} className="admin-time-filter" action={action} method="get" aria-label={`${label}筛选`}>
      <div>
        <span>{label}</span>
        <small>{summary}</small>
      </div>
      <div className="admin-time-presets" role="group" aria-label="快捷时间范围">
        {quickRanges.map((item) => (
          <button
            className={selectedRange === item.value ? 'active' : ''}
            key={item.value}
            type="button"
            onClick={() => applyQuickRange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label>
        <span>周期</span>
        <select
          name="range"
          value={selectedRange}
          onChange={(event) => {
            setSelectedRange(event.target.value);
            if (event.target.value !== 'custom') submitSoon();
          }}
        >
          <option value="day">今天</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="year">今年</option>
          <option value="custom">自定义</option>
        </select>
      </label>
      <label>
        <span>开始</span>
        <input type="date" name="start" defaultValue={start} onChange={() => setSelectedRange('custom')} />
      </label>
      <label>
        <span>结束</span>
        <input type="date" name="end" defaultValue={end} onChange={() => setSelectedRange('custom')} />
      </label>
      <button type="submit" onClick={() => setIsSubmitting(true)}>{isSubmitting ? '查询中' : '应用'}</button>
    </form>
  );
}
