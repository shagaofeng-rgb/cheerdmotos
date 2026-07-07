export type AdminTimeRange = 'day' | 'week' | 'month' | 'year' | 'custom';

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

const rangeLabels: Record<AdminTimeRange, string> = {
  day: '今天',
  week: '本周',
  month: '本月',
  year: '今年',
  custom: '自定义'
};

function shanghaiNow() {
  return new Date(Date.now() + SHANGHAI_OFFSET_MS);
}

function toUtcFromShanghai(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, ms = 0) {
  return new Date(Date.UTC(year, month, day, hour, minute, second, ms) - SHANGHAI_OFFSET_MS);
}

function dateInputValue(date: Date) {
  const shanghai = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  return shanghai.toISOString().slice(0, 10);
}

function parseDateParts(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (!year || month < 0 || month > 11 || day < 1 || day > 31) return null;
  return {year, month, day};
}

function startOfShanghaiDate(value: string | undefined, fallback: Date) {
  const parts = parseDateParts(value);
  if (!parts) return fallback;
  return toUtcFromShanghai(parts.year, parts.month, parts.day);
}

function endOfShanghaiDate(value: string | undefined, fallback: Date) {
  const parts = parseDateParts(value);
  if (!parts) return fallback;
  return toUtcFromShanghai(parts.year, parts.month, parts.day, 23, 59, 59, 999);
}

export function parseAdminTimeFilter(searchParams: Record<string, string | string[] | undefined>) {
  const now = shanghaiNow();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const dayOfWeek = now.getUTCDay() || 7;
  const rangeParam = Array.isArray(searchParams.range) ? searchParams.range[0] : searchParams.range;
  const range = (['day', 'week', 'month', 'year', 'custom'].includes(rangeParam || '') ? rangeParam : 'month') as AdminTimeRange;
  const earliestCustomStart = toUtcFromShanghai(year - 2, month, day);
  let from = toUtcFromShanghai(year, month, day);
  let to = toUtcFromShanghai(year, month, day, 23, 59, 59, 999);
  let note = '';

  if (range === 'week') from = toUtcFromShanghai(year, month, day - dayOfWeek + 1);
  if (range === 'month') from = toUtcFromShanghai(year, month, 1);
  if (range === 'year') from = toUtcFromShanghai(year, 0, 1);
  if (range === 'custom') {
    const startParam = Array.isArray(searchParams.start) ? searchParams.start[0] : searchParams.start;
    const endParam = Array.isArray(searchParams.end) ? searchParams.end[0] : searchParams.end;
    from = startOfShanghaiDate(startParam, earliestCustomStart);
    to = endOfShanghaiDate(endParam, to);
    if (from < earliestCustomStart) {
      from = earliestCustomStart;
      note = '自定义查询最多保留最近 2 年。';
    }
    if (from > to) [from, to] = [to, from];
  }

  const start = dateInputValue(from);
  const end = dateInputValue(to);
  return {
    range,
    start,
    end,
    from,
    to,
    timezone: 'Asia/Shanghai',
    summary: `${rangeLabels[range]} | ${start} 至 ${end} | 北京时间${note ? ` | ${note}` : ''}`
  };
}
