import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {BlobNotFoundError, del, get, put} from '@vercel/blob';

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

async function writeBlobText(fileName: string, text: string, contentType = 'text/plain; charset=utf-8') {
  await put(blobPath(fileName), text, {
    access: 'private',
    allowOverwrite: true,
    contentType,
    cacheControlMaxAge: 60,
    token: BLOB_TOKEN
  });
}

async function writeLocalLines(fileName: string, values: unknown[]) {
  await ensureLocalParent(fileName);
  await fs.writeFile(localFile(fileName), `${values.map((value) => JSON.stringify(value)).join('\n')}${values.length ? '\n' : ''}`, 'utf8');
}

export async function appendStoreLine(fileName: string, value: unknown) {
  if (durableStoreConfigured()) {
    if (KV_URL && KV_TOKEN) {
      await kvPipeline([['RPUSH', storeKey(fileName), JSON.stringify(value)]]);
      return;
    }
    const current = await readBlobText(fileName);
    await writeBlobText(fileName, `${current}${JSON.stringify(value)}\n`);
    return;
  }
  await ensureLocalParent(fileName);
  await fs.appendFile(localFile(fileName), `${JSON.stringify(value)}\n`, 'utf8');
}

export async function appendStoreLines(fileName: string, values: unknown[]) {
  if (!values.length) return;
  if (durableStoreConfigured()) {
    if (KV_URL && KV_TOKEN) {
      await kvPipeline([['RPUSH', storeKey(fileName), ...values.map((value) => JSON.stringify(value))]]);
      return;
    }
    const current = await readBlobText(fileName);
    await writeBlobText(fileName, `${current}${values.map((value) => JSON.stringify(value)).join('\n')}\n`);
    return;
  }
  await ensureLocalParent(fileName);
  await fs.appendFile(localFile(fileName), `${values.map((value) => JSON.stringify(value)).join('\n')}\n`, 'utf8');
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
  if (durableStoreConfigured()) {
    if (KV_URL && KV_TOKEN) {
      const key = storeKey(fileName);
      const commands = values.length
        ? [['DEL', key], ['RPUSH', key, ...values.map((value) => JSON.stringify(value))]]
        : [['DEL', key]];
      await kvPipeline(commands);
      return;
    }
    await writeBlobText(fileName, `${values.map((value) => JSON.stringify(value)).join('\n')}${values.length ? '\n' : ''}`);
    return;
  }
  await writeLocalLines(fileName, values);
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
  await ensureLocalParent(fileName);
  await fs.writeFile(localFile(fileName), JSON.stringify(value, null, 2), 'utf8');
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
    const current = safeJson<StoreLockValue>(await readBlobText(fileName));
    if (lockActive(current)) return null;
    if (current) await del(blobPath(fileName), {token: BLOB_TOKEN}).catch(() => undefined);
    try {
      await put(blobPath(fileName), serialized, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: 'application/json; charset=utf-8',
        cacheControlMaxAge: 60,
        token: BLOB_TOKEN
      });
      return {...value, name, provider: 'vercel_blob'};
    } catch {
      return null;
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
    const current = safeJson<StoreLockValue>(await fs.readFile(filePath, 'utf8').catch(() => ''));
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
    const current = safeJson<StoreLockValue>(await readBlobText(fileName));
    if (current?.token === lock.token) await del(blobPath(fileName), {token: BLOB_TOKEN});
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
      await new Promise((resolve) => setTimeout(resolve, options.retryDelayMs || 100));
    }
  }
  if (!lock) throw new Error(`Could not acquire durable lock: ${name}`);
  try {
    return await task();
  } finally {
    await releaseStoreLock(lock).catch((error) => {
      console.error('[durable-store] lock release failed', {name, error: error instanceof Error ? error.message : String(error)});
    });
  }
}
