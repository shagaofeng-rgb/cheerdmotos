import crypto from 'node:crypto';
import {readStoreObject} from '@/lib/durableStore';

const CREDENTIAL_FILE = 'integration-webhook-credentials.json';

type WebhookCredentials = {
  blogWebhookKeyHash?: string;
  updatedAt?: string;
};

function hashApiKey(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function matchesHash(actualHash: string, expectedHash: string) {
  const actual = Buffer.from(actualHash, 'utf8');
  const expected = Buffer.from(expectedHash, 'utf8');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function verifyBlogWebhookApiKey(apiKey: string) {
  const configuredHash = process.env.BLOG_WEBHOOK_API_KEY_HASH ||
    (await readStoreObject<WebhookCredentials>(CREDENTIAL_FILE))?.blogWebhookKeyHash || '';
  if (!apiKey || !configuredHash) return false;
  return matchesHash(hashApiKey(apiKey), configuredHash);
}

export async function blogWebhookConfigured() {
  const stored = await readStoreObject<WebhookCredentials>(CREDENTIAL_FILE);
  return Boolean(process.env.BLOG_WEBHOOK_API_KEY_HASH || stored?.blogWebhookKeyHash);
}
