import {appendStoreLine, readStoreLines} from '@/lib/durableStore';

const NEWS_AUDIT_FILE = 'news-publication-audits.jsonl';
const NEWS_JOB_FILE = 'news-jobs.jsonl';

export type NewsAutomationResult = 'success' | 'skipped' | 'failed' | 'review_required';

export type NewsPublicationAudit = {
  id: string;
  type: 'news' | 'blog';
  result: NewsAutomationResult;
  slug: string;
  title: string;
  sourceUrl: string;
  sourceName: string;
  sourcePublishedAt: string;
  productSlugs: string[];
  reason: string;
  createdAt: string;
};

export type NewsJobLog = {
  id: string;
  type: 'news' | 'blog';
  target: number;
  alreadyPublishedToday: number;
  publishedCount: number;
  status: 'completed' | 'partial' | 'failed';
  message: string;
  createdAt: string;
};

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export async function appendNewsAudit(input: Omit<NewsPublicationAudit, 'id' | 'createdAt'>) {
  const audit: NewsPublicationAudit = {
    id: id('news-audit'),
    createdAt: new Date().toISOString(),
    ...input
  };
  await appendStoreLine(NEWS_AUDIT_FILE, audit);
  return audit;
}

export async function readNewsAudits(limit = 200) {
  return (await readStoreLines<NewsPublicationAudit>(NEWS_AUDIT_FILE)).slice(-limit).reverse();
}

export async function appendNewsJobLog(input: Omit<NewsJobLog, 'id' | 'createdAt'>) {
  const log: NewsJobLog = {
    id: id('news-job'),
    createdAt: new Date().toISOString(),
    ...input
  };
  await appendStoreLine(NEWS_JOB_FILE, log);
  return log;
}

export async function readNewsJobLogs(limit = 100) {
  return (await readStoreLines<NewsJobLog>(NEWS_JOB_FILE)).slice(-limit).reverse();
}
