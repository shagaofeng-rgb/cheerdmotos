import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {BlobNotFoundError, BlobPreconditionFailedError, del, get, head, put} from '@vercel/blob';

type RedisResult<T> = {
  result?: T;
  error?: string;
};

const LOCAL_DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'cheerdmoto-commerce') : path.join(process.cwd(), '.data');
const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
const STORE_PREFIX = process.env.COMMERCE_STORE_PREFIX || 'cheerdmoto-commerce';

type StoreLockValue = {
  token: string;
  expiresAt: string;
};

export type StoreLock = StoreLockValue & {
  name: string;
  provider: 'kv_rest' | 'vercel_blob' | 'local_file';
  etag?: string;
};

export function durableStoreConfigured() {
  return Boolean((KV_URL && KV_TOKEN) || BLOB_TOKEN);
}

export function durableStoreStatus() {
  return {
    configured: durableStoreConfigured(),
    provider: KV_URL && KV_TOKEN ? 'kv_rest' : BLOB_TOKEN ? 'vercel_blob' : process.env.VERCEL ? 'serverless_tmp_fallback' : 'local_file',
    storePrefix: STORE_PREFIX
  };
}

export function persistentWritesAvailable() {
  return !process.env.VERCEL || durableStoreConfigured();
}

function storeKey(fileName: string) {
  return `${STORE_PREFIX}:${fileName.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
}

function localFile(fileName: string) {
  return path.join(LOCAL_DATA_DIR, fileName);
}

async function ensureLocalParent(fileName: string) {
  await fs.mkdir(path.dirname(localFile(fileName)), {recursive: true});
}

function blobPath(fileName: string) {
  return `${STORE_PREFIX}/${fileName.replace(/[^a-zA-Z0-9._/-]/g, '-')}`;
}

function safeJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function kvPipeline<T>(commands: string[][]) {
  const response = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands),
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Durable store request failed: ${response.status}`);
  }
  const payload = await response.json() as RedisResult<T>[];
  const error = payload.find((item) => item.error)?.error;
  if (error) throw new Error(`Durable store command failed: ${error}`);
  return payload.map((item) => item.result);
}

async function readLocalLines<T>(fileName: string) {
  try {
    const text = await fs.readFile(localFile(fileName), 'utf8');
    return text.split(/\r?\n/).map((line) => safeJson<T>(line)).filter(Boolean) as T[];
  } catch {
    return [];
  }
}

async function readBlobText(fileName: string) {
  try {
    const result = await get(blobPath(fileName), {
      access: 'private',
      token: BLOB_TOKEN,
      useCache: false
    });
    if (!result || result.statusCode !== 200) return '';
    return await new Response(result.stream).text();
  } catch (error) {
    if (error instanceof BlobNotFoundError) return '';
    throw error;
  }
}

async function writeBlobText(fileName: string, text: string, contentType = 'text/plain; charset=utf-8', expected?: {etag: string} | null) {
  return put(blobPath(fileName), text, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: expected !== null,
    ...(expected ? {ifMatch: expected.etag} : {}),
    contentType,
    cacheControlMaxAge: 60,
    token: BLOB_TOKEN
  });
}

async function replaceLocalFile(fileName: string, content: string) {
  await ensureLocalParent(fileName);
  const temporary = `${localFile(fileName)}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, content, 'utf8');
    await fs.rename(temporary, localFile(fileName));
  } finally {
    await fs.rm(temporary, {force: true});
  }
}

export async function appendStoreLine(fileName: string, value: unknown) {
  await appendStoreLines(fileName, [value]);
}

export async function appendStoreLines(fileName: string, values: unknown[]) {
  if (!values.length) return;
  const lines = values.map((value) => JSON.stringify(value));
  if (durableStoreConfigured()) {
    if (KV_URL && KV_TOKEN) {
      await kvPipeline([['RPUSH', storeKey(fileName), ...lines]]);
      return;
    }
    return withStoreLock(`append-${fileName}`, async () => {
      const current = (await readBlobText(fileName)).trimEnd();
      const prefix = current ? `${current}\n` : '';
      await writeBlobText(fileName, `${prefix}${lines.join('\n')}\n`);
    }, {ttlSeconds: 45, attempts: 12});
  }
  await ensureLocalParent(fileName);
  await fs.appendFile(localFile(fileName), `${lines.join('\n')}\n`, 'utf8');
}

export async function readStoreLines<T>(fileName: string) {
  if (durableStoreConfigured()) {
    if (KV_URL && KV_TOKEN) {
      const [items] = await kvPipeline<string[]>([['LRANGE', storeKey(fileName), '0', '-1']]);
      return (Array.isArray(items) ? items : []).map((item) => safeJson<T>(item)).filter(Boolean) as T[];
    }
    return (await readBlobText(fileName)).split(/\r?\n/).map((line) => safeJson<T>(line)).filter(Boolean) as T[];
  }
  return readLocalLines<T>(fileName);
}

export async function writeStoreLines(fileName: string, values: unknown[]) {
  const lines = values.map((value) => JSON.stringify(value));
  const content = lines.length ? `${lines.join('\n')}\n` : '';
  if (durableStoreConfigured()) {
    if (KV_URL && KV_TOKEN) {
      const key = storeKey(fileName);
      const script = "redis.call('del', KEYS[1]); for i = 1, #ARGV do redis.call('rpush', KEYS[1], ARGV[i]) end; return #ARGV";
      await kvPipeline([['EVAL', script, '1', key, ...lines]]);
      return;
    }
    await writeBlobText(fileName, content);
    return;
  }
  await replaceLocalFile(fileName, content);
}

export async function readStoreObject<T>(fileName: string) {
  if (durableStoreConfigured()) {
    if (KV_URL && KV_TOKEN) {
      const [value] = await kvPipeline<string | null>([['GET', storeKey(fileName)]]);
      return safeJson<T>(value);
    }
    return safeJson<T>(await readBlobText(fileName));
  }
  try {
    return JSON.parse(await fs.readFile(localFile(fileName), 'utf8')) as T;
  } catch {
    return null;
  }
}

export async function writeStoreObject(fileName: string, value: unknown) {
  if (durableStoreConfigured()) {
    if (KV_URL && KV_TOKEN) {
      await kvPipeline([['SET', storeKey(fileName), JSON.stringify(value)]]);
      return;
    }
    await writeBlobText(fileName, JSON.stringify(value, null, 2), 'application/json; charset=utf-8');
    return;
  }
  await replaceLocalFile(fileName, JSON.stringify(value, null, 2));
}

function lockFileName(name: string) {
  return `locks/${name.replace(/[^a-zA-Z0-9._-]/g, '-')}.json`;
}

function lockValue(ttlSeconds: number): StoreLockValue {
  return {
    token: randomUUID(),
    expiresAt: new Date(Date.now() + Math.max(5, ttlSeconds) * 1000).toISOString()
  };
}

function lockActive(value: StoreLockValue | null) {
  return Boolean(value?.token && new Date(value.expiresAt).getTime() > Date.now());
}

function blobWriteConflict(error: unknown) {
  return error instanceof BlobPreconditionFailedError || (error instanceof Error && /already exists/i.test(error.message));
}

export async function acquireStoreLock(name: string, ttlSeconds = 60): Promise<StoreLock | null> {
  const fileName = lockFileName(name);
  const value = lockValue(ttlSeconds);
  const serialized = JSON.stringify(value);

  if (KV_URL && KV_TOKEN) {
    const [result] = await kvPipeline<string | null>([
      ['SET', storeKey(fileName), serialized, 'NX', 'EX', String(Math.max(5, ttlSeconds))]
    ]);
    return result === 'OK' ? {...value, name, provider: 'kv_rest'} : null;
  }

  if (BLOB_TOKEN) {
    try {
      const blob = await writeBlobText(fileName, serialized, 'application/json; charset=utf-8', null);
      return {...value, name, provider: 'vercel_blob', etag: blob.etag};
    } catch (error) {
      if (!blobWriteConflict(error)) throw error;
    }
    try {
      // The Blob API's metadata version is authoritative for replacing an expired lease.
      const current = await head(blobPath(fileName), {token: BLOB_TOKEN});
      if (lockActive(safeJson<StoreLockValue>(await readBlobText(fileName)))) return null;
      const blob = await writeBlobText(fileName, serialized, 'application/json; charset=utf-8', {etag: current.etag});
      return {...value, name, provider: 'vercel_blob', etag: blob.etag};
    } catch (error) {
      if (error instanceof BlobNotFoundError || blobWriteConflict(error)) return null;
      throw error;
    }
  }

  const filePath = localFile(fileName.replaceAll('/', '-'));
  await fs.mkdir(LOCAL_DATA_DIR, {recursive: true});
  try {
    const handle = await fs.open(filePath, 'wx');
    await handle.writeFile(serialized, 'utf8');
    await handle.close();
    return {...value, name, provider: 'local_file'};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const current = safeJson<StoreLockValue>(await fs.readFile(filePath, 'utf8').catch(() => ''));
    if (!current) return null;
    if (lockActive(current)) return null;
    await fs.unlink(filePath).catch(() => undefined);
    try {
      const handle = await fs.open(filePath, 'wx');
      await handle.writeFile(serialized, 'utf8');
      await handle.close();
      return {...value, name, provider: 'local_file'};
    } catch {
      return null;
    }
  }
}

export async function releaseStoreLock(lock: StoreLock) {
  const fileName = lockFileName(lock.name);
  if (lock.provider === 'kv_rest') {
    const script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
    await kvPipeline([['EVAL', script, '1', storeKey(fileName), JSON.stringify({token: lock.token, expiresAt: lock.expiresAt})]]);
    return;
  }
  if (lock.provider === 'vercel_blob') {
    if (lock.etag) await del(blobPath(fileName), {token: BLOB_TOKEN, ifMatch: lock.etag});
    return;
  }
  const filePath = localFile(fileName.replaceAll('/', '-'));
  const current = safeJson<StoreLockValue>(await fs.readFile(filePath, 'utf8').catch(() => ''));
  if (current?.token === lock.token) await fs.unlink(filePath).catch(() => undefined);
}

export async function withStoreLock<T>(
  name: string,
  task: () => Promise<T>,
  options: {ttlSeconds?: number; attempts?: number; retryDelayMs?: number} = {}
) {
  const attempts = Math.max(1, options.attempts || 1);
  let lock: StoreLock | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lock = await acquireStoreLock(name, options.ttlSeconds || 60);
    if (lock) break;
    if (attempt + 1 < attempts) {
      const baseDelay = options.retryDelayMs || 100;
      const delay = Math.min(2_000, baseDelay * (2 ** Math.min(attempt, 3))) + Math.floor(Math.random() * baseDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  if (!lock) throw new Error(`Could not acquire durable lock after ${attempts} attempts: ${name}`);
  try {
    return await task();
  } finally {
    await releaseStoreLock(lock).catch((error) => {
      console.error('[durable-store] lock release failed', {name, error: error instanceof Error ? error.message : String(error)});
    });
  }
}
