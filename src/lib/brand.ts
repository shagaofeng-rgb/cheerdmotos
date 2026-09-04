export const BRAND_NAME = 'COWIN';

const LEGACY_BRAND_PATTERN = /CHEERDMOTO|CheerdMoto|Cheerdmoto/g;

export function currentBrand(value: string) {
  return value.replace(LEGACY_BRAND_PATTERN, BRAND_NAME);
}

export function normalizeBrandValue<T>(value: T): T {
  if (typeof value === 'string') return currentBrand(value) as T;
  if (Array.isArray(value)) return value.map((item) => normalizeBrandValue(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeBrandValue(item)])
    ) as T;
  }
  return value;
}
