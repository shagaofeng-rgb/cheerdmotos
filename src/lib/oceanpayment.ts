import crypto from 'node:crypto';
import {siteUrl} from '@/lib/site';
import type {PaymentMethod, StoreOrder} from '@/lib/commerceStore';

export type OceanpaymentMethod = 'credit-card' | 'google-pay' | 'apple-pay';
export type OceanpaymentScene = '3d' | 'non-3d';

const scriptUrls = {
  core: 'https://secure.oceanpayment.com/pub/js/op.js',
  jquery: 'https://secure.oceanpayment.com/pub/js/jquery/jq.js',
  'credit-card': 'https://secure.oceanpayment.com/pages/js/oceanpayment.js',
  'google-pay': 'https://secure.oceanpayment.com/gateway/js/googlepay_ec.js',
  'apple-pay': 'https://secure.oceanpayment.com/gateway/js/applepay_ec.js'
} as const;

export function oceanpaymentConfig(method: OceanpaymentMethod = 'credit-card') {
  const account = envValue(process.env.OCEANPAYMENT_ACCOUNT || process.env.OCEANPAYMENT_MERCHANT_NO);
  const wallet = method === 'google-pay' || method === 'apple-pay';
  const terminal = wallet
    ? envValue(process.env.OCEANPAYMENT_WALLET_TERMINAL || process.env.OCEANPAYMENT_TERMINAL || process.env.OCEANPAYMENT_TERMINAL_NO)
    : envValue(process.env.OCEANPAYMENT_CARD_TERMINAL || process.env.OCEANPAYMENT_TERMINAL || process.env.OCEANPAYMENT_TERMINAL_NO);
  const secureCode = wallet
    ? envValue(process.env.OCEANPAYMENT_WALLET_SECURE_CODE || process.env.OCEANPAYMENT_SECURE_CODE)
    : envValue(process.env.OCEANPAYMENT_CARD_SECURE_CODE || process.env.OCEANPAYMENT_SECURE_CODE);
  const publicKey = wallet
    ? envValue(process.env.OCEANPAYMENT_WALLET_PUBLIC_KEY || process.env.OCEANPAYMENT_CARD_PUBLIC_KEY || process.env.OCEANPAYMENT_PUBLIC_KEY)
    : envValue(process.env.OCEANPAYMENT_CARD_PUBLIC_KEY || process.env.OCEANPAYMENT_PUBLIC_KEY);
  const endpoint = envValue(process.env.OCEANPAYMENT_GATEWAY_URL) || 'https://secure.oceanpayment.com/gateway/service/test';
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || siteUrl).replace(/\/$/, '');
  const requiredEnv = wallet
    ? ['OCEANPAYMENT_ACCOUNT', 'OCEANPAYMENT_WALLET_TERMINAL', 'OCEANPAYMENT_WALLET_SECURE_CODE', 'OCEANPAYMENT_WALLET_PUBLIC_KEY']
    : ['OCEANPAYMENT_ACCOUNT', 'OCEANPAYMENT_CARD_TERMINAL', 'OCEANPAYMENT_CARD_SECURE_CODE', 'OCEANPAYMENT_CARD_PUBLIC_KEY'];
  return {
    account,
    terminal,
    secureCode,
    publicKey,
    endpoint,
    baseUrl,
    environment: process.env.OCEANPAYMENT_ENV || 'test',
    configured: Boolean(account && terminal && secureCode && publicKey),
    requiredEnv
  };
}

function oceanpaymentConfigForTerminal(terminal: string) {
  const normalized = gatewayField(terminal, 40);
  const walletTerminal = gatewayField(
    process.env.OCEANPAYMENT_WALLET_TERMINAL || process.env.OCEANPAYMENT_TERMINAL || process.env.OCEANPAYMENT_TERMINAL_NO,
    40
  );
  return normalized && walletTerminal && normalized === walletTerminal
    ? oceanpaymentConfig('google-pay')
    : oceanpaymentConfig('credit-card');
}

export function sanitizeOceanpaymentFields(fields: Record<string, string>) {
  const sensitive = /card|cvv|cvc|token|password|secure|secret|key|sign/i;
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      sensitive.test(key) ? maskValue(value) : clean(value, 500)
    ])
  );
}

function maskValue(value: string) {
  const cleanValue = clean(value, 500);
  if (!cleanValue) return '';
  if (cleanValue.length <= 4) return '****';
  return `${'*'.repeat(Math.min(12, cleanValue.length - 4))}${cleanValue.slice(-4)}`;
}

export function paymentMethodToOceanpayment(value: string): OceanpaymentMethod {
  if (value === 'oceanpayment_google_pay') return 'google-pay';
  if (value === 'oceanpayment_apple_pay') return 'apple-pay';
  return 'credit-card';
}

export function oceanpaymentToStoreMethod(value: OceanpaymentMethod): PaymentMethod {
  if (value === 'google-pay') return 'oceanpayment_google_pay';
  if (value === 'apple-pay') return 'oceanpayment_apple_pay';
  return 'oceanpayment_card';
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function envValue(value: unknown) {
  return String(value || '').trim();
}

function amount(value: number) {
  return Math.max(0.01, value).toFixed(2);
}

function clean(value: unknown, limit = 120) {
  return String(value || '').trim().slice(0, limit);
}

function gatewayField(value: unknown, limit = 120) {
  return clean(value, limit)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[<>'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameParts(value: string) {
  return gatewayField(value, 160)
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .map((part) => gatewayField(part, 80))
    .filter(Boolean);
}

function splitName(order: StoreOrder) {
  const customerParts = nameParts(order.customer.name);
  const emailParts = nameParts(order.customer.email.split('@')[0] || '');
  const orderFallback = `Order${order.id.slice(-6) || Date.now().toString().slice(-6)}`;
  const firstName = gatewayField(order.checkout.firstName || customerParts[0] || emailParts[0] || orderFallback, 80);
  let lastName = gatewayField(
    order.checkout.lastName ||
      customerParts.slice(1).join(' ') ||
      emailParts.find((part) => part.toLowerCase() !== firstName.toLowerCase()) ||
      orderFallback,
    80
  );
  if (lastName.toLowerCase() === firstName.toLowerCase()) {
    lastName = gatewayField(emailParts.find((part) => part.toLowerCase() !== firstName.toLowerCase()) || orderFallback, 80);
  }
  return {firstName, lastName};
}

const alpha3ToAlpha2: Record<string, string> = {
  ARE: 'AE',
  AUS: 'AU',
  CAN: 'CA',
  CHE: 'CH',
  CHN: 'CN',
  DEU: 'DE',
  ESP: 'ES',
  FRA: 'FR',
  GBR: 'GB',
  ITA: 'IT',
  JPN: 'JP',
  KOR: 'KR',
  MDV: 'MV',
  NLD: 'NL',
  NZL: 'NZ',
  PRT: 'PT',
  SGP: 'SG',
  SAU: 'SA',
  BRA: 'BR',
  IDN: 'ID',
  ZAF: 'ZA',
  THA: 'TH',
  USA: 'US'
};

const countryNameToAlpha2: Record<string, string> = {
  america: 'US',
  australia: 'AU',
  brazil: 'BR',
  brasil: 'BR',
  britain: 'GB',
  canada: 'CA',
  china: 'CN',
  deutschland: 'DE',
  france: 'FR',
  germany: 'DE',
  indonesia: 'ID',
  italy: 'IT',
  japan: 'JP',
  maldives: 'MV',
  netherlands: 'NL',
  'new zealand': 'NZ',
  portugal: 'PT',
  singapore: 'SG',
  'south africa': 'ZA',
  'south korea': 'KR',
  korea: 'KR',
  spain: 'ES',
  thailand: 'TH',
  'united arab emirates': 'AE',
  uae: 'AE',
  dubai: 'AE',
  'united kingdom': 'GB',
  uk: 'GB',
  'great britain': 'GB',
  'united states': 'US',
  usa: 'US',
  'united states of america': 'US',
  'saudi arabia': 'SA',
  saudi: 'SA',
  南非: 'ZA',
  巴西: 'BR',
  印尼: 'ID',
  印度尼西亚: 'ID',
  美国: 'US',
  沙特: 'SA',
  英国: 'GB',
  加拿大: 'CA',
  葡萄牙: 'PT',
  西班牙: 'ES'
};

function normalizeLookupKey(value: string) {
  return clean(value, 120)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function countryCode(value: string) {
  const raw = clean(value, 80);
  const upper = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  if (/^[A-Z]{3}$/.test(upper) && alpha3ToAlpha2[upper]) return alpha3ToAlpha2[upper];
  const normalized = normalizeLookupKey(raw);
  return countryNameToAlpha2[normalized] || countryNameToAlpha2[raw] || '';
}

function gatewayStateCode(countryIso: string, value: string) {
  const normalized = clean(value, 40).toUpperCase().replace(/_/g, '-');
  return normalized.startsWith(`${countryIso}-`) ? normalized.slice(countryIso.length + 1) : normalized;
}

const usSubdivisionCodes: Record<string, string> = {
  alabama: 'US-AL',
  al: 'US-AL',
  alaska: 'US-AK',
  ak: 'US-AK',
  arizona: 'US-AZ',
  az: 'US-AZ',
  arkansas: 'US-AR',
  ar: 'US-AR',
  california: 'US-CA',
  ca: 'US-CA',
  colorado: 'US-CO',
  co: 'US-CO',
  connecticut: 'US-CT',
  ct: 'US-CT',
  delaware: 'US-DE',
  de: 'US-DE',
  florida: 'US-FL',
  fl: 'US-FL',
  georgia: 'US-GA',
  ga: 'US-GA',
  hawaii: 'US-HI',
  hi: 'US-HI',
  idaho: 'US-ID',
  id: 'US-ID',
  illinois: 'US-IL',
  il: 'US-IL',
  indiana: 'US-IN',
  in: 'US-IN',
  iowa: 'US-IA',
  ia: 'US-IA',
  kansas: 'US-KS',
  ks: 'US-KS',
  kentucky: 'US-KY',
  ky: 'US-KY',
  louisiana: 'US-LA',
  la: 'US-LA',
  maine: 'US-ME',
  me: 'US-ME',
  maryland: 'US-MD',
  md: 'US-MD',
  massachusetts: 'US-MA',
  ma: 'US-MA',
  michigan: 'US-MI',
  mi: 'US-MI',
  minnesota: 'US-MN',
  mn: 'US-MN',
  mississippi: 'US-MS',
  ms: 'US-MS',
  missouri: 'US-MO',
  mo: 'US-MO',
  montana: 'US-MT',
  mt: 'US-MT',
  nebraska: 'US-NE',
  ne: 'US-NE',
  nevada: 'US-NV',
  nv: 'US-NV',
  'new hampshire': 'US-NH',
  nh: 'US-NH',
  'new jersey': 'US-NJ',
  nj: 'US-NJ',
  'new mexico': 'US-NM',
  nm: 'US-NM',
  'new york': 'US-NY',
  ny: 'US-NY',
  'north carolina': 'US-NC',
  nc: 'US-NC',
  'north dakota': 'US-ND',
  nd: 'US-ND',
  ohio: 'US-OH',
  oh: 'US-OH',
  oklahoma: 'US-OK',
  ok: 'US-OK',
  oregon: 'US-OR',
  or: 'US-OR',
  pennsylvania: 'US-PA',
  pa: 'US-PA',
  'rhode island': 'US-RI',
  ri: 'US-RI',
  'south carolina': 'US-SC',
  sc: 'US-SC',
  'south dakota': 'US-SD',
  sd: 'US-SD',
  tennessee: 'US-TN',
  tn: 'US-TN',
  texas: 'US-TX',
  tx: 'US-TX',
  utah: 'US-UT',
  ut: 'US-UT',
  vermont: 'US-VT',
  vt: 'US-VT',
  virginia: 'US-VA',
  va: 'US-VA',
  washington: 'US-WA',
  wa: 'US-WA',
  'west virginia': 'US-WV',
  wv: 'US-WV',
  wisconsin: 'US-WI',
  wi: 'US-WI',
  wyoming: 'US-WY',
  wy: 'US-WY'
};

const caSubdivisionCodes: Record<string, string> = {
  alberta: 'CA-AB',
  ab: 'CA-AB',
  'british columbia': 'CA-BC',
  bc: 'CA-BC',
  manitoba: 'CA-MB',
  mb: 'CA-MB',
  'new brunswick': 'CA-NB',
  nb: 'CA-NB',
  'newfoundland and labrador': 'CA-NL',
  nl: 'CA-NL',
  'nova scotia': 'CA-NS',
  ns: 'CA-NS',
  ontario: 'CA-ON',
  on: 'CA-ON',
  'prince edward island': 'CA-PE',
  pe: 'CA-PE',
  quebec: 'CA-QC',
  qc: 'CA-QC',
  saskatchewan: 'CA-SK',
  sk: 'CA-SK'
};

const auSubdivisionCodes: Record<string, string> = {
  'new south wales': 'AU-NSW',
  nsw: 'AU-NSW',
  queensland: 'AU-QLD',
  qld: 'AU-QLD',
  'south australia': 'AU-SA',
  sa: 'AU-SA',
  tasmania: 'AU-TAS',
  tas: 'AU-TAS',
  victoria: 'AU-VIC',
  vic: 'AU-VIC',
  'western australia': 'AU-WA',
  wa: 'AU-WA'
};

const cnSubdivisionCodes: Record<string, string> = {
  zhejiang: 'CN-ZJ',
  zj: 'CN-ZJ',
  '浙江': 'CN-ZJ',
  '浙江省': 'CN-ZJ',
  guangdong: 'CN-GD',
  gd: 'CN-GD',
  '广东': 'CN-GD',
  '广东省': 'CN-GD',
  shanghai: 'CN-SH',
  '上海': 'CN-SH',
  '上海市': 'CN-SH',
  beijing: 'CN-BJ',
  '北京': 'CN-BJ',
  '北京市': 'CN-BJ',
  jiangsu: 'CN-JS',
  js: 'CN-JS',
  '江苏': 'CN-JS',
  '江苏省': 'CN-JS'
};

const gbSubdivisionCodes: Record<string, string> = {
  england: 'GB-ENG',
  eng: 'GB-ENG',
  scotland: 'GB-SCT',
  sct: 'GB-SCT',
  wales: 'GB-WLS',
  wls: 'GB-WLS',
  'northern ireland': 'GB-NIR',
  nir: 'GB-NIR'
};

const subdivisionMaps: Record<string, Record<string, string>> = {
  AU: auSubdivisionCodes,
  CA: caSubdivisionCodes,
  CN: cnSubdivisionCodes,
  GB: gbSubdivisionCodes,
  US: usSubdivisionCodes
};

type BillingStateResult = {
  billingCountry: string;
  billingState: string;
  valid: boolean;
  warnings: string[];
  message?: string;
};

export function normalizeBillingState({
  country,
  state,
  city
}: {
  country: string;
  state?: string;
  city?: string;
}): BillingStateResult {
  const countryIso = countryCode(country);
  const warnings: string[] = [];
  if (!countryIso) {
    return {
      billingCountry: '',
      billingState: '',
      valid: false,
      warnings: ['Billing country could not be normalized to ISO 3166-1 alpha-2.'],
      message: 'Please complete your billing address country and state/province information.'
    };
  }
  const raw = clean(state, 80);
  const cityKey = normalizeLookupKey(city || '');
  if (!raw) {
    warnings.push('Missing state/province; using billing_country as ISO fallback until Oceanpayment confirms whether ISO 3166-1 or ISO 3166-2 is required.');
    return {billingCountry: countryIso, billingState: countryIso, valid: true, warnings};
  }
  const normalizedCode = raw.toUpperCase().replace(/_/g, '-');
  if (/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(normalizedCode)) {
    return {billingCountry: countryIso, billingState: gatewayStateCode(countryIso, normalizedCode), valid: true, warnings};
  }
  const rawAsCountry = countryCode(raw);
  if (rawAsCountry) {
    warnings.push('State/province looked like a country value; using ISO country fallback for billing_state.');
    return {billingCountry: countryIso, billingState: rawAsCountry, valid: true, warnings};
  }
  const key = normalizeLookupKey(raw);
  if (key && key === cityKey) {
    warnings.push('State/province matched city; using billing_country as ISO fallback.');
    return {billingCountry: countryIso, billingState: countryIso, valid: true, warnings};
  }
  const mapped = subdivisionMaps[countryIso]?.[key];
  if (mapped) return {billingCountry: countryIso, billingState: gatewayStateCode(countryIso, mapped), valid: true, warnings};
  if (/^[A-Z]{2,3}$/.test(normalizedCode) && subdivisionMaps[countryIso]) {
    return {billingCountry: countryIso, billingState: normalizedCode, valid: true, warnings};
  }
  warnings.push('State/province was not recognized; using billing_country as ISO fallback.');
  return {billingCountry: countryIso, billingState: countryIso, valid: true, warnings};
}

export function validateOceanpaymentBillingState(billingState: string) {
  const value = gatewayField(billingState, 40);
  if (!value) return false;
  if (/[\u4e00-\u9fff]/.test(value)) return false;
  if (/undefined|null|nan|\[object object\]/i.test(value)) return false;
  return /^[A-Z0-9]{1,3}$/.test(value);
}

export function buildOceanpaymentPayload({
  order,
  method,
  scene,
  locale,
  checkoutUrl,
  billingIp,
  forceTestMode
}: {
  order: StoreOrder;
  method: OceanpaymentMethod;
  scene: OceanpaymentScene;
  locale: string;
  checkoutUrl?: string;
  billingIp?: string;
  forceTestMode?: boolean;
}) {
  const config = oceanpaymentConfig(method);
  const {firstName, lastName} = splitName(order);
  const orderAmount = amount(order.total);
  const orderNumber = gatewayField(order.id, 120);
  const orderCurrency = gatewayField(order.currency || 'USD', 8).toUpperCase();
  const billingEmail = gatewayField(order.customer.email, 160);
  const signSource = `${config.account}${config.terminal}${orderNumber}${orderCurrency}${orderAmount}${firstName}${lastName}${billingEmail}${config.secureCode}`;
  const signValue = sha256(signSource);
  const noticeUrl = `${config.baseUrl}/api/payments/oceanpayment/notice`;
  const backUrl = `${config.baseUrl}/api/payments/oceanpayment/back?locale=${encodeURIComponent(locale)}`;
  const methodName = method === 'credit-card' ? 'Credit Card' : method === 'google-pay' ? 'Google Pay' : 'Apple Pay';
  const testMode = forceTestMode || !/^prod(uction)?$/i.test(config.environment);
  const billing = normalizeBillingState({
    country: order.customer.country,
    state: order.checkout.state,
    city: order.checkout.city
  });
  if (!billing.valid || !validateOceanpaymentBillingState(billing.billingState)) {
    throw new Error(billing.message || 'Please complete your billing address state/province information.');
  }
  const billingCountry = billing.billingCountry;
  const billingState = billing.billingState;

  return {
    gatewayUrl: config.endpoint,
    sdkUrl: scriptUrls[method],
    sdkUrls: method === 'credit-card'
      ? [scriptUrls.core, scriptUrls.jquery, scriptUrls['credit-card']]
      : [scriptUrls.core, scriptUrls[method]],
    configured: config.configured,
    testMode,
    requiredEnv: config.requiredEnv,
    fields: {
      account: config.account,
      terminal: config.terminal,
      key: config.publicKey,
      order_number: orderNumber,
      order_currency: orderCurrency,
      order_amount: orderAmount,
      order_notes: gatewayField(order.productName, 180),
      methods: methodName,
      payment_scenario: scene === '3d' ? '3D' : 'Non-3D',
      billing_firstName: firstName,
      billing_lastName: lastName,
      billing_email: billingEmail,
      billing_phone: gatewayField(order.customer.phone, 40),
      billing_country: billingCountry,
      billing_state: billingState,
      billing_city: gatewayField(order.checkout.city || 'NA', 80),
      billing_address: gatewayField(order.customer.address, 240),
      billing_zip: gatewayField(order.checkout.zip || '00000', 32),
      ship_firstName: firstName,
      ship_lastName: lastName,
      ship_email: billingEmail,
      ship_phone: gatewayField(order.customer.phone, 40),
      ship_country: billingCountry,
      ship_state: billingState,
      ship_city: gatewayField(order.checkout.city || 'NA', 80),
      ship_addr: gatewayField(order.customer.address, 240),
      ship_zip: gatewayField(order.checkout.zip || '00000', 32),
      productName: gatewayField(order.productName, 180),
      productNum: String(order.quantity),
      productSku: gatewayField(order.productSlug, 80),
      productPrice: amount(order.unitPrice),
      cart_info: gatewayField(`${order.productName} x ${order.quantity}`, 140),
      billing_ip: gatewayField(billingIp || '127.0.0.1', 40),
      backUrl,
      noticeUrl,
      signValue
    },
    signature: {
      algorithm: 'sha256',
      structure: 'account + terminal + order_number + order_currency + order_amount + billing_firstName + billing_lastName + billing_email + secureCode',
      fields: ['account', 'terminal', 'order_number', 'order_currency', 'order_amount', 'billing_firstName', 'billing_lastName', 'billing_email', 'secureCode'],
      sourceLength: signSource.length,
      secureCodeLength: config.secureCode.length,
      signValue
    },
    billing
  };
}

export function verifyOceanpaymentReturn(fields: Record<string, string>) {
  const config = oceanpaymentConfigForTerminal(fields.terminal || '');
  const signFields = [
    gatewayField(fields.account, 80),
    gatewayField(fields.terminal, 80),
    gatewayField(fields.order_number, 120),
    gatewayField(fields.order_currency, 8).toUpperCase(),
    gatewayField(fields.order_amount, 40),
    gatewayField(fields.order_notes, 240),
    gatewayField(fields.card_number, 80),
    gatewayField(fields.payment_id, 120),
    gatewayField(fields.payment_authType, 80),
    gatewayField(fields.payment_status, 80),
    gatewayField(fields.payment_details, 240),
    gatewayField(fields.payment_risk, 80),
    config.secureCode
  ];
  const expected = sha256(
    signFields.join('')
  );
  return Boolean(fields.signValue && expected.toLowerCase() === fields.signValue.toLowerCase());
}

export function validateOceanpaymentNotification(order: StoreOrder, fields: Record<string, string>) {
  const errors: string[] = [];
  const config = oceanpaymentConfigForTerminal(fields.terminal || '');
  const callbackOrderNumber = gatewayField(fields.order_number || fields.orderNo || fields.order_id, 120);
  const callbackCurrency = gatewayField(fields.order_currency || fields.currency, 20).toUpperCase();
  const callbackAmount = Number(gatewayField(fields.order_amount || fields.amount, 40));

  if (callbackOrderNumber !== order.id) errors.push('order_number_mismatch');
  if (callbackCurrency && callbackCurrency !== order.currency) errors.push('currency_mismatch');
  if (!Number.isFinite(callbackAmount) || amount(callbackAmount) !== amount(order.total)) errors.push('amount_mismatch');
  if (fields.account && gatewayField(fields.account, 80) !== config.account) errors.push('account_mismatch');
  if (fields.terminal && config.terminal && gatewayField(fields.terminal, 80) !== config.terminal) errors.push('terminal_mismatch');

  return {ok: errors.length === 0, errors};
}

export function oceanpaymentStatusToOrder(fields: Record<string, string>) {
  const status = (fields.payment_status || fields.status || '').toString();
  if (/^(1|success|paid|approved)$/i.test(status)) {
    return {status: 'paid' as const, gatewayStatus: 'success' as const, logisticsStatus: 'Payment confirmed by Oceanpayment. Sales team can arrange order processing.'};
  }
  if (/^(0|pending|processing)$/i.test(status)) {
    return {status: 'pending_payment' as const, gatewayStatus: 'pending' as const, logisticsStatus: 'Oceanpayment transaction is pending final confirmation.'};
  }
  return {status: 'failed' as const, gatewayStatus: 'failed' as const, logisticsStatus: 'Oceanpayment transaction failed or was declined. Buyer may retry or contact sales.'};
}

export async function parseGatewayPayload(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await request.json();
    return Object.fromEntries(Object.entries(json).map(([key, value]) => [key, gatewayField(value, 500)]));
  }
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    return Object.fromEntries([...formData.entries()].map(([key, value]) => [key, gatewayField(value, 500)]));
  }
  const text = await request.text();
  const xmlPairs = [...text.matchAll(/<([^/?][^>\s]*)[^>]*>([^<]*)<\/\1>/g)].map((match) => [match[1], gatewayField(match[2], 500)]);
  if (xmlPairs.length) return Object.fromEntries(xmlPairs);
  return Object.fromEntries([...new URLSearchParams(text).entries()].map(([key, value]) => [key, gatewayField(value, 500)]));
}
