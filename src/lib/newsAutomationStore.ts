import {readStoreLines, writeStoreLines} from '@/lib/durableStore';

const NEWS_CANDIDATE_FILE = 'news-candidates.jsonl';
const NEWS_RUN_FILE = 'news-runs.jsonl';
const NEWS_PUBLICATION_FILE = 'news-publications.jsonl';
const NEWS_DELIVERY_FILE = 'news-deliveries.jsonl';

export type NewsRunStatus = 'running' | 'completed' | 'partial' | 'dry_run' | 'no_candidate' | 'locked' | 'config_error' | 'failed' | 'delivery_failed';

export type NewsRunLog = {
  id: string;
  trigger: 'cron' | 'manual' | 'delivery_test';
  status: NewsRunStatus;
  target: number;
  fetchedCount: number;
  acceptedCount: number;
  publishedCount: number;
  skippedCount: number;
  sourceCount: number;
  message: string;
  startedAt: string;
  finishedAt: string;
  test: boolean;
};

export type NewsCandidateRecord = {
  id: string;
  runId: string;
  fingerprint: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt: string;
  productSlugs: string[];
  relevanceScore: number;
  result: 'accepted' | 'skipped';
  reason: string;
  createdAt: string;
  test: boolean;
};

export type NewsPublicationRecord = {
  id: string;
  runId: string;
  slug: string;
  title: string;
  sourceUrl: string;
  fingerprint: string;
  result: 'published' | 'rolled_back';
  reason: string;
  createdAt: string;
  test: boolean;
};

export type NewsDeliveryRecord = {
  id: string;
  runId: string;
  slug: string;
  detailUrl: string;
  listOk: boolean;
  detailOk: boolean;
  sitemapOk: boolean;
  attempts: number;
  result: 'success' | 'failed';
  error: string;
  checkedAt: string;
  test: boolean;
};

async function appendBounded<T>(fileName: string, records: T[], limit: number) {
  if (!records.length) return records;
  const current = await readStoreLines<T>(fileName);
  await writeStoreLines(fileName, [...current, ...records].slice(-limit));
  return records;
}

export async function appendNewsRun(log: NewsRunLog) {
  await appendBounded(NEWS_RUN_FILE, [log], 400);
  return log;
}

export async function appendNewsCandidate(record: NewsCandidateRecord) {
  await appendBounded(NEWS_CANDIDATE_FILE, [record], 1600);
  return record;
}

export async function appendNewsCandidates(records: NewsCandidateRecord[]) {
  await appendBounded(NEWS_CANDIDATE_FILE, records, 1600);
  return records;
}

export async function appendNewsPublication(record: NewsPublicationRecord) {
  await appendBounded(NEWS_PUBLICATION_FILE, [record], 400);
  return record;
}

export async function appendNewsDelivery(record: NewsDeliveryRecord) {
  await appendBounded(NEWS_DELIVERY_FILE, [record], 400);
  return record;
}

export async function readNewsRuns(limit = 80) {
  return (await readStoreLines<NewsRunLog>(NEWS_RUN_FILE)).slice(-limit).reverse();
}

export async function readNewsCandidates(limit = 120) {
  return (await readStoreLines<NewsCandidateRecord>(NEWS_CANDIDATE_FILE)).slice(-limit).reverse();
}

export async function readNewsPublications(limit = 80) {
  return (await readStoreLines<NewsPublicationRecord>(NEWS_PUBLICATION_FILE)).slice(-limit).reverse();
}

export async function readNewsDeliveries(limit = 80) {
  return (await readStoreLines<NewsDeliveryRecord>(NEWS_DELIVERY_FILE)).slice(-limit).reverse();
}

export async function cleanupNewsAutomationTestRecords() {
  const [runs, candidates, publications, deliveries] = await Promise.all([
    readStoreLines<NewsRunLog>(NEWS_RUN_FILE),
    readStoreLines<NewsCandidateRecord>(NEWS_CANDIDATE_FILE),
    readStoreLines<NewsPublicationRecord>(NEWS_PUBLICATION_FILE),
    readStoreLines<NewsDeliveryRecord>(NEWS_DELIVERY_FILE)
  ]);
  const removed = [runs, candidates, publications, deliveries].reduce((sum, records) => sum + records.filter((record) => record.test).length, 0);
  await Promise.all([
    writeStoreLines(NEWS_RUN_FILE, runs.filter((record) => !record.test)),
    writeStoreLines(NEWS_CANDIDATE_FILE, candidates.filter((record) => !record.test)),
    writeStoreLines(NEWS_PUBLICATION_FILE, publications.filter((record) => !record.test)),
    writeStoreLines(NEWS_DELIVERY_FILE, deliveries.filter((record) => !record.test))
  ]);
  return {removed};
}
