import {createHash, randomUUID} from 'node:crypto';
import {appendStoreLine, readStoreLines, withStoreLock, writeStoreLines} from '@/lib/durableStore';
import {sendContactInquiryEmail} from '@/lib/emailService';

const FILE = 'contact-inquiries.jsonl';
const LOCK = 'contact-inquiries';
const OPTIONS = {attempts: 12, ttlSeconds: 90};

export type InquiryDetails = {
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  buyerType: string;
  product: string;
  quantity: string;
  targetMarket: string;
  waterArea: string;
  oem: string;
  destinationPort: string;
  message: string;
};

export type ContactInquiry = {
  id: string;
  requestKey: string;
  page: string;
  details: InquiryDetails;
  createdAt: string;
  test: boolean;
  delivery: {status: 'pending' | 'sent' | 'skipped' | 'failed'; attempts: number; attemptedAt: string};
};

export function readContactInquiries() {
  return readStoreLines<ContactInquiry>(FILE);
}

export async function saveContactInquiry(details: InquiryDetails, options: {requestId: string; page: string; test: boolean}) {
  const requestKey = options.requestId
    ? createHash('sha256').update(JSON.stringify([options.requestId, details, options.test])).digest('hex')
    : '';
  return withStoreLock(LOCK, async () => {
    const previous = requestKey && (await readContactInquiries()).find((record) => record.requestKey === requestKey);
    if (previous) return {inquiry: previous, created: false};
    const inquiry: ContactInquiry = {
      id: `${options.test ? 'contact-test' : 'contact'}-${randomUUID()}`,
      requestKey, details, page: options.page, test: options.test, createdAt: new Date().toISOString(),
      delivery: {status: 'pending', attempts: 0, attemptedAt: ''}
    };
    await appendStoreLine(FILE, inquiry);
    return {inquiry, created: true};
  }, OPTIONS);
}

export async function deliverContactInquiry(id: string) {
  return withStoreLock(`inquiry-delivery-${id}`, async () => {
    const inquiry = (await readContactInquiries()).find((record) => record.id === id);
    if (!inquiry || inquiry.delivery.status === 'sent') return inquiry || null;
    const result = await sendContactInquiryEmail(inquiry.details, id).catch(() => null);
    const delivery: ContactInquiry['delivery'] = {
      status: !result ? 'failed' : result.skipped ? 'skipped' : 'sent',
      attempts: inquiry.delivery.attempts + 1,
      attemptedAt: new Date().toISOString()
    };
    return withStoreLock(LOCK, async () => {
      const records = await readContactInquiries();
      const index = records.findIndex((record) => record.id === id);
      if (index === -1) return null;
      const updated = {...inquiry, delivery};
      records[index] = updated;
      await writeStoreLines(FILE, records);
      return updated;
    }, OPTIONS);
  }, OPTIONS);
}

export function clearTestInquiry(id: string) {
  return withStoreLock(LOCK, async () => {
    const records = await readContactInquiries();
    const retained = records.filter((record) => !(record.id === id && record.test));
    if (retained.length !== records.length) await writeStoreLines(FILE, retained);
  }, OPTIONS);
}
