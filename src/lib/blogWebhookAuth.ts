import crypto from 'node:crypto';
import {readStoreObject} from '@/lib/durableStore';

const CREDENTIAL_FILE = 'integration-webhook-credentials.json';

type WebhookCredentials = {
  blogWebhookKeyHash?: string;
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
  const configuredSign = process.env.WEBHOOK_ARTICLE_SIGN || '';
  const configuredHash = configuredSign
    ? hashApiKey(configuredSign)
    : process.env.BLOG_WEBHOOK_API_KEY_HASH || (await readStoreObject<WebhookCredentials>(CREDENTIAL_FILE))?.blogWebhookKeyHash || '';
  return Boolean(apiKey && configuredHash && matchesHash(hashApiKey(apiKey), configuredHash));
}
