import type {SiteItem} from '@/types';

export type ProductSpec = {label: string; value: string};
export type ProductFaq = {question: string; answer: string};

export type ProductPresentation = {
  displayName: string;
  category: string;
  categoryRoute: string;
  model: string;
  sku: string;
  inStock: boolean;
  gallery: string[];
  featureImage: string;
  shortDescription: string;
  description: string;
  keyFeatures: string[];
  quickSpecs: ProductSpec[];
  specifications: ProductSpec[];
  packageIncludes: string[];
  faq: ProductFaq[];
};

const assetBase = '/homepage-assets/cheerdmoto_style_a_rally_terrain';

const commonFaq: ProductFaq[] = [
  {question: 'How do I choose the right option?', answer: 'Compare the published specifications with your intended use, then contact our support team if you need help confirming compatibility.'},
  {question: 'Is this item in stock?', answer: 'The product page shows the current availability status. Availability can change before an order is submitted.'},
  {question: 'What payment methods are available?', answer: 'Secure card checkout is handled through the available Oceanpayment checkout options after you submit your order details.'},
  {question: 'How can I contact support?', answer: 'Use the support page for product, order, warranty, and delivery questions before or after purchase.'}
];

type ProductOverrides = Partial<Omit<ProductPresentation, 'displayName' | 'sku' | 'inStock' | 'shortDescription' | 'description' | 'faq'>> & {
  displayName?: string;
  description?: string;
};

const productOverrides: Record<string, ProductOverrides> = {
  'xceed-electric-dirt-bike': {
    displayName: 'XCEED Electric Dirt Bike',
    category: 'Electric Dirt Bikes',
    categoryRoute: '/electric-dirt-bikes',
    model: 'XCEED 72V',
    gallery: [
      `${assetBase}/assets/products/xceed_transparent.png`,
      `${assetBase}/assets/source/xceed_product.webp`,
      `${assetBase}/slices/04_xceed_feature_story.webp`
    ],
    featureImage: `${assetBase}/slices/04_xceed_feature_story.webp`,
    description: 'XCEED is a 72V electric dirt bike platform built for riders who want responsive electric power, trail-ready handling, and a clear upgrade path for their riding setup.',
    keyFeatures: ['72V electric platform', '8,500W peak output', 'Up to 53 MPH top speed', 'Samsung 30Ah battery configuration'],
    quickSpecs: [{label: 'Voltage', value: '72V'}, {label: 'Peak power', value: '8,500W'}, {label: 'Top speed', value: '53 MPH'}, {label: 'Battery', value: '30Ah'}],
    specifications: [{label: 'Model', value: 'XCEED 72V'}, {label: 'Voltage', value: '72V'}, {label: 'Peak power', value: '8,500W'}, {label: 'Top speed', value: '53 MPH'}, {label: 'Battery', value: 'Samsung 30Ah lithium battery'}]
  },
  'cheerdmoto-performance-96v-electric-dirtbike-xtreme': {
    displayName: 'XTREME 96V Electric Dirt Bike',
    category: 'Electric Dirt Bikes',
    categoryRoute: '/electric-dirt-bikes',
    model: 'XTREME 96V',
    gallery: [
      `${assetBase}/assets/products/xtreme_transparent.png`,
      `${assetBase}/assets/source/xtreme_product.webp`,
      `${assetBase}/assets/source/xtreme_lifestyle.webp`
    ],
    featureImage: `${assetBase}/assets/source/xtreme_lifestyle.webp`,
    description: 'XTREME is CHEERDMOTO\'s high-output 96V electric dirt bike platform for riders prioritizing torque, top speed, and serious terrain capability.',
    keyFeatures: ['96V performance platform', '15,000W peak output', '72 MPH top speed', 'Up to 95 km estimated range'],
    quickSpecs: [{label: 'Voltage', value: '96V'}, {label: 'Peak power', value: '15,000W'}, {label: 'Top speed', value: '72 MPH'}, {label: 'Estimated range', value: '95 km'}],
    specifications: [{label: 'Model', value: 'XTREME 96V'}, {label: 'Motor', value: '96V 6,000W rated / 15,000W peak'}, {label: 'Battery', value: '96V 50Ah lithium-ion'}, {label: 'Top speed', value: '115 km/h'}, {label: 'Estimated range', value: '95 km'}, {label: 'Max load', value: '150 kg'}]
  },
  'cheerdmoto-electric-wheelchair-smart-b02': {
    displayName: 'SMART B02 Electric Wheelchair',
    category: 'Electric Wheelchairs',
    categoryRoute: '/electric-wheelchairs',
    model: 'SMART B02',
    gallery: [
      `${assetBase}/assets/products/smart_b02_transparent.png`,
      `${assetBase}/assets/source/smart_b02_product.webp`,
      `${assetBase}/slices/06_smart_b02_mobility_banner.webp`
    ],
    featureImage: `${assetBase}/slices/06_smart_b02_mobility_banner.webp`,
    description: 'SMART B02 is a folding electric wheelchair designed for practical everyday movement, with dual-motor drive, compact storage, and indoor-outdoor usability.',
    keyFeatures: ['Dual 250W motor system', 'Up to 15 mile range', '350 lb load capacity', 'Foldable steel frame'],
    quickSpecs: [{label: 'Motor', value: '250W x 2'}, {label: 'Range', value: 'Up to 15 miles'}, {label: 'Load capacity', value: '350 lbs'}, {label: 'Frame', value: 'Foldable steel'}],
    specifications: [{label: 'Model', value: 'SMART B02'}, {label: 'Motor', value: 'DC24V 250W x 2'}, {label: 'Battery', value: '12V 12Ah x 2'}, {label: 'Range', value: 'Up to 15 miles'}, {label: 'Max climbing', value: '12 degrees'}, {label: 'Load capacity', value: '350 lbs'}]
  },
  'grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto': {
    displayName: 'XPLORE 1350W Fat Tire E-Bike',
    category: 'E Bikes',
    categoryRoute: '/e-bikes',
    model: 'XPLORE',
    gallery: [`${assetBase}/assets/products/xplore_transparent.png`, `${assetBase}/assets/source/xplore_product.webp`],
    featureImage: `${assetBase}/assets/source/xplore_product.webp`,
    description: 'XPLORE is an over-frame fat tire e-bike designed for daily utility, comfortable riding, and mixed-surface confidence.',
    keyFeatures: ['1,350W peak motor', '48V 20Ah removable battery', 'Up to 100 km stated range', '7-speed Shimano drivetrain'],
    quickSpecs: [{label: 'Peak motor', value: '1,350W'}, {label: 'Battery', value: '48V 20Ah'}, {label: 'Top speed', value: '20 MPH'}, {label: 'Drivetrain', value: '7-speed Shimano'}],
    specifications: [{label: 'Model', value: 'XPLORE'}, {label: 'Peak motor', value: '1,350W'}, {label: 'Battery', value: '48V 20Ah removable lithium'}, {label: 'Top speed', value: '20 MPH'}, {label: 'Brakes', value: 'Hydraulic disc brakes'}, {label: 'Weather protection', value: 'IP65 wiring'}]
  },
  'grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto': {
    displayName: 'XCITE 1350W Step-Thru E-Bike',
    category: 'E Bikes',
    categoryRoute: '/e-bikes',
    model: 'XCITE',
    gallery: [`${assetBase}/assets/products/xcite_transparent.png`, `${assetBase}/assets/source/xcite_product.webp`],
    featureImage: `${assetBase}/assets/source/xcite_product.webp`,
    description: 'XCITE is a step-thru fat tire e-bike built for easy access, daily comfort, and straightforward city-to-trail riding.',
    keyFeatures: ['Step-thru access', '1,350W peak motor', '48V 20Ah removable battery', 'Hydraulic disc brakes'],
    quickSpecs: [{label: 'Peak motor', value: '1,350W'}, {label: 'Battery', value: '48V 20Ah'}, {label: 'Top speed', value: '20 MPH'}, {label: 'Frame', value: 'Step-thru'}],
    specifications: [{label: 'Model', value: 'XCITE'}, {label: 'Peak motor', value: '1,350W'}, {label: 'Battery', value: '48V 20Ah removable lithium'}, {label: 'Top speed', value: '20 MPH'}, {label: 'Brakes', value: 'Hydraulic disc brakes'}, {label: 'Weather protection', value: 'IP65 wiring'}]
  },
  'grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike': {
    displayName: 'XPLUS 1350W Fat Tire Moped Bike',
    category: 'E Bikes',
    categoryRoute: '/e-bikes',
    model: 'XPLUS',
    gallery: [`${assetBase}/assets/products/xplus_transparent.png`, `${assetBase}/assets/source/xplus_product.webp`],
    featureImage: `${assetBase}/assets/source/xplus_product.webp`,
    description: 'XPLUS is a full-suspension fat tire moped bike for riders seeking a more comfortable mixed-surface ride.',
    keyFeatures: ['1,350W peak motor', 'Full suspension comfort', '48V 20Ah removable battery', '7-speed Shimano drivetrain'],
    quickSpecs: [{label: 'Peak motor', value: '1,350W'}, {label: 'Battery', value: '48V 20Ah'}, {label: 'Top speed', value: '20 MPH'}, {label: 'Suspension', value: 'Front and rear'}],
    specifications: [{label: 'Model', value: 'XPLUS'}, {label: 'Peak motor', value: '1,350W'}, {label: 'Battery', value: '48V 20Ah removable lithium'}, {label: 'Top speed', value: '20 MPH'}, {label: 'Suspension', value: 'Full suspension'}, {label: 'Brakes', value: 'Hydraulic disc brakes'}]
  }
};

function cleanText(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replaceAll('鈥?', '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function genericCategory(item: SiteItem) {
  if (item.route.includes('wheelchair')) return {category: 'Electric Wheelchairs', categoryRoute: '/electric-wheelchairs'};
  if (/helmet|kit|battery|display/.test(item.slug)) return {category: 'Accessories', categoryRoute: '/accessories'};
  if (item.route.includes('bike') && !item.route.includes('dirt')) return {category: 'E Bikes', categoryRoute: '/e-bikes'};
  return {category: 'Electric Dirt Bikes', categoryRoute: '/electric-dirt-bikes'};
}

export function productPresentation(item: SiteItem): ProductPresentation {
  const override = productOverrides[item.slug] || {};
  const fallbackCategory = genericCategory(item);
  const image = item.image || '';
  const gallery = [...new Set([...(override.gallery || []), image].filter(Boolean))];
  const description = cleanText(override.description || item.description || 'Product details will be confirmed by the CHEERDMOTO support team.');
  const sku = item.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  const availability = item.availability || '';
  const inStock = !/outofstock|out of stock|sold out/i.test(availability);
  const model = override.model || item.title.split('|')[0]?.trim() || item.slug;
  const quickSpecs = override.quickSpecs || [{label: 'Category', value: override.category || fallbackCategory.category}, {label: 'Currency', value: item.currency || 'USD'}];
  const specifications = override.specifications || [{label: 'Model', value: model}, {label: 'SKU', value: sku}, {label: 'Category', value: override.category || fallbackCategory.category}];
  return {
    displayName: override.displayName || cleanText(item.title),
    category: override.category || fallbackCategory.category,
    categoryRoute: override.categoryRoute || fallbackCategory.categoryRoute,
    model,
    sku,
    inStock,
    gallery,
    featureImage: override.featureImage || gallery[1] || gallery[0] || '',
    shortDescription: description.slice(0, 240),
    description,
    keyFeatures: override.keyFeatures || [],
    quickSpecs,
    specifications,
    packageIncludes: override.packageIncludes || [],
    faq: commonFaq
  };
}
