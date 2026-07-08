import {appendStoreLine, readStoreLines} from '@/lib/durableStore';

const AUDIT_FILE = 'admin-audit.jsonl';

export type AdminAuditLog = {
  id: string;
  actor: string;
  action: string;
  module: string;
  result: 'success' | 'failed';
  ip: string;
  userAgent: string;
  detail: string;
  createdAt: string;
};

export async function appendAuditLog(input: Omit<AdminAuditLog, 'id' | 'createdAt'>) {
  const log: AdminAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...input
  };
  await appendStoreLine(AUDIT_FILE, log);
  return log;
}

export async function readAuditLogs(limit = 200) {
  const logs = await readStoreLines<AdminAuditLog>(AUDIT_FILE);
  return logs.slice(-limit).reverse();
}
