import type {CheckoutProductSlug} from '@/lib/site';

type ShippingGroup = 'standard' | 'oversize';

const standardRates: Record<string, number> = {
  south_africa: 2000,
  brazil: 2000,
  indonesia: 350,
  united_states: 650,
  saudi_arabia: 650,
  united_kingdom: 650,
  canada: 650,
  portugal: 650,
  spain: 650
};

const oversizeRates: Record<string, number> = {
  south_africa: 10000,
  brazil: 5000,
  indonesia: 1600,
  united_states: 1600,
  saudi_arabia: 1600,
  united_kingdom: 1600,
  canada: 1600,
  portugal: 1600,
  spain: 1600
};

function shippingGroupFor(productSlug: CheckoutProductSlug): ShippingGroup {
  return /dirtbike|dirt-bike|xceed|xtreme|xplus|xplore|xcite/.test(productSlug) ? 'oversize' : 'standard';
}

function normalizeCountry(country: string) {
  const normalized = country.trim().toLowerCase();
  if (/south africa|南非/.test(normalized)) return 'south_africa';
  if (/brazil|brasil|巴西/.test(normalized)) return 'brazil';
  if (/indonesia|印尼|印度尼西亚/.test(normalized)) return 'indonesia';
  if (/usa|u\.s\.a|united states|america|美国/.test(normalized)) return 'united_states';
  if (/saudi|沙特/.test(normalized)) return 'saudi_arabia';
  if (/united kingdom|great britain|britain|uk|英国/.test(normalized)) return 'united_kingdom';
  if (/canada|加拿大/.test(normalized)) return 'canada';
  if (/portugal|葡萄牙/.test(normalized)) return 'portugal';
  if (/spain|西班牙/.test(normalized)) return 'spain';
  return '';
}

export function shippingEstimateFor(productSlug: CheckoutProductSlug, country: string) {
  if (productSlug === 'payment-test' || productSlug === 'one-time-35') return 0;
  const group = shippingGroupFor(productSlug);
  const countryKey = normalizeCountry(country);
  const rates = group === 'oversize' ? oversizeRates : standardRates;
  return countryKey ? rates[countryKey] ?? (group === 'oversize' ? 1600 : 650) : group === 'oversize' ? 1600 : 650;
}
