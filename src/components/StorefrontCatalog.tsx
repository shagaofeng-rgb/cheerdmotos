import Image from 'next/image';
import Link from 'next/link';
import {listPublicProducts} from '@/lib/publicCatalog';
import {productPresentation} from '@/lib/productPresentation';
import {modelLayout} from '@/lib/storefrontModels';
import {CATALOG_PAGE_SIZE, paginateItems, readPage, readParam, storefrontHref, type SearchParams} from '@/lib/storefrontPagination';
import type {SiteItem} from '@/types';
import StorefrontPagination from './StorefrontPagination';
import {StoreArt, StorefrontV1, StoreHero, StoreIcon, StoreLink} from './StorefrontV1';

const cutouts = '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products';
const collections = [
  {path: '/products', label: 'All products', title: 'Find your COWIN.', description: 'Compare electric dirt bikes, e-bikes, electric wheelchairs and model-specific accessories.', image: '/homepage-precision/precision-studio-hero.webp', photo: true},
  {path: '/electric-dirt-bikes', label: 'Electric dirt bikes', title: 'Electric dirt bikes.', description: 'Explore the XCEED 72V and XTREME 96V platforms by power, speed and battery configuration.', image: `${cutouts}/xtreme_transparent.png`},
  {path: '/e-bikes', label: 'Electric bikes', title: 'Find your ride.', description: 'Compare the over-frame XPLORE, step-through XCITE and full-suspension XPLUS.', image: `${cutouts}/xplore_transparent.png`},
  {path: '/electric-wheelchairs', label: 'Electric wheelchairs', title: 'Mobility that fits your day.', description: 'Explore the SMART B02 folding electric wheelchair and check the fit for your needs.', image: `${cutouts}/smart_b02_transparent.png`},
  {path: '/accessories', label: 'Parts & accessories', title: 'Parts that fit.', description: 'Shop riding gear and XCEED components. Check compatibility before you order.', icon: 'wrench'},
  {path: '/clearance', label: 'Clearance', title: 'Clearance.', description: 'Find available clearance and refurbished inventory when listed.', icon: 'tag'}
];

function numericPrice(price: string) {
  return Number(price.replace(/[^0-9.]/g, ''));
}

export function StoreProductCard({item}: {item: SiteItem}) {
  const product = productPresentation(item);
  const layout = modelLayout(item.slug);
  const price = numericPrice(item.price);
  const photo = product.gallery[0];
  return <Link className="card product-tile" href={item.route} prefetch={false}>
    <div className="card-media">{photo
      ? <Image src={photo} alt={product.displayName} width={480} height={320} sizes="(max-width: 700px) 50vw, 33vw" />
      : <div className="diagram"><div className="figure"><StoreIcon name={layout?.illustration || 'box'} /><small>Illustration</small></div></div>}</div>
    <div className="card-body"><p className="kicker">{product.category}</p><h3>{layout?.title || product.displayName}</h3><p>{layout?.tagline || product.shortDescription}</p><div className="card-meta"><strong>{price > 0 ? new Intl.NumberFormat('en-US', {style: 'currency', currency: item.currency || 'USD', minimumFractionDigits: Number.isInteger(price) ? 0 : 2}).format(price) : 'Ask for pricing'}</strong><StoreIcon name="arrow-right" /></div></div>
  </Link>;
}

export async function collectionProducts(route: string) {
  const catalog = await listPublicProducts();
  return catalog.filter((product) => {
    if (route === '/products') return true;
    if (route === '/clearance') return /clearance|refurbished/.test(product.categorySlug || '');
    return productPresentation(product).categoryRoute === route;
  });
}

export async function StorefrontCatalog({item, query}: {item: SiteItem; query: SearchParams}) {
  const design = collections.find(({path}) => path === item.route) || collections[0];
  const products = await collectionProducts(item.route);
  const sort = readParam(query.sort);
  if (sort === 'price-asc' || sort === 'price-desc') {
    const direction = sort === 'price-asc' ? 1 : -1;
    products.sort((a, b) => (numericPrice(a.price) - numericPrice(b.price)) * direction);
  }
  const page = paginateItems(products, readPage(query.page), CATALOG_PAGE_SIZE);
  const sorts = [['Featured', ''], ['Price: low to high', 'price-asc'], ['Price: high to low', 'price-desc']];
  return <StorefrontV1><main>
    <StoreHero eyebrow="COWIN / Shop" title={design.title} description={design.description} art={<StoreArt image={design.image} icon={design.icon} photo={design.photo} />} tight>
      {products.length > 0 && <StoreLink primary arrow href="#catalog">Browse {item.route === '/products' ? 'products' : 'models'}</StoreLink>}
      <StoreLink href="/dealer-program">Dealer &amp; bulk orders</StoreLink>
    </StoreHero>
    <section className="shell section" id="catalog">
      <header className="section-head"><div><p className="kicker">{products.length} {products.length === 1 ? 'product' : 'products'}</p><h2>{design.label}</h2></div></header>
      <div className="filterbar">
        <nav className="chips" aria-label="Product categories">{collections.map(({path, label}) => <Link className="chip" key={path} href={path} aria-current={path === item.route ? 'true' : undefined}>{label}</Link>)}</nav>
        {products.length > 1 && <details className="catalog-sort"><summary><StoreIcon name="sliders-horizontal" /> {sorts.find(([, value]) => value === sort)?.[0] || 'Featured'}</summary><nav aria-label="Sort products">{sorts.map(([label, value]) => <Link key={label} href={`${storefrontHref(item.route, query, {sort: value})}#catalog`} aria-current={sort === value ? 'page' : undefined}>{label}</Link>)}</nav></details>}
      </div>
      {products.length ? <>
        <div className="cards">{page.items.map((product) => <StoreProductCard item={product} key={product.slug} />)}</div>
        <StorefrontPagination pathname={item.route} params={query} label={design.label} {...page} />
      </> : <div className="empty"><div className="state-symbol"><StoreIcon name={design.icon || 'package'} /></div><h2>{item.route === '/clearance' ? 'No clearance items available' : 'No products available'}</h2><p>Browse the regular catalog for current models and accessories.</p><StoreLink primary arrow href="/products">Shop all products</StoreLink></div>}
    </section>
  </main></StorefrontV1>;
}
