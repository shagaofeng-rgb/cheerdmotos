type ShippingGroup = 'standard' | 'oversize';

export const contiguousUsStates = [
  'AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA',
  'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND',
  'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];
const usStateNames = new Set([
  'alabama', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida',
  'georgia', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine',
  'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana',
  'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina',
  'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina',
  'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia',
  'wisconsin', 'wyoming'
]);

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

function shippingGroupFor(productSlug: string): ShippingGroup {
  return /dirtbike|dirt-bike|xceed|xtreme|xplus|xplore|xcite/.test(productSlug) ? 'oversize' : 'standard';
}

function normalizeCountry(country: string) {
  const normalized = country.trim().toLowerCase();
  if (/south africa|南非/.test(normalized)) return 'south_africa';
  if (/brazil|brasil|巴西/.test(normalized)) return 'brazil';
  if (/indonesia|印尼|印度尼西亚/.test(normalized)) return 'indonesia';
  if (/^(us|usa|u\.s\.?a?\.?|united states(?: of america)?|美国)$/.test(normalized)) return 'united_states';
  if (/saudi|沙特/.test(normalized)) return 'saudi_arabia';
  if (/united kingdom|great britain|britain|uk|英国/.test(normalized)) return 'united_kingdom';
  if (/canada|加拿大/.test(normalized)) return 'canada';
  if (/portugal|葡萄牙/.test(normalized)) return 'portugal';
  if (/spain|西班牙/.test(normalized)) return 'spain';
  return '';
}

export function shippingEstimateFor(productSlug: string, country: string, state = '') {
  if (productSlug === 'payment-test' || productSlug === 'one-time-35') return 0;
  const group = shippingGroupFor(productSlug);
  const countryKey = normalizeCountry(country);
  const region = state.trim();
  if (countryKey === 'united_states' && (contiguousUsStates.includes(region.toUpperCase()) || usStateNames.has(region.toLowerCase()))) return 0;
  const rates = group === 'oversize' ? oversizeRates : standardRates;
  return countryKey ? rates[countryKey] ?? (group === 'oversize' ? 1600 : 650) : group === 'oversize' ? 1600 : 650;
}
