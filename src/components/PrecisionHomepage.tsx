import Image from 'next/image';
import Link from 'next/link';
import {getAllNewsArticles} from '@/lib/newsFeed';
import {listPublicProducts} from '@/lib/publicCatalog';
import {PrecisionStorefrontFooter, PrecisionStorefrontHeader} from './PrecisionStorefrontChrome';
import styles from './PrecisionHomepage.module.css';

const productBase = '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets';

const models = [
  {
    slug: 'cheerdmoto-performance-96v-electric-dirtbike-xtreme',
    name: 'XTREME 96V',
    note: 'Maximum-output dirt bike',
    image: `${productBase}/products/xtreme_transparent.png`,
    href: '/products/cheerdmoto-performance-96v-electric-dirtbike-xtreme',
    specs: ['15,000W peak', '72 MPH', '95 km range']
  },
  {
    slug: 'xceed-electric-dirt-bike',
    name: 'XCEED 72V',
    note: 'Balanced trail performance',
    image: `${productBase}/products/xceed_transparent.png`,
    href: '/products/xceed-electric-dirt-bike',
    specs: ['8,500W peak', '53 MPH', '30Ah battery']
  },
  {
    slug: 'grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike',
    name: 'XPLUS',
    note: 'Full-suspension daily comfort',
    image: `${productBase}/products/xplus_transparent.png`,
    href: '/products/grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike',
    specs: ['1,350W peak', '20 MPH', '48V 20Ah']
  }
];

const cityModels = [
  {
    slug: 'grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto',
    name: 'XCITE',
    note: 'Step-thru access',
    image: `${productBase}/products/xcite_transparent.png`,
    href: '/products/grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto'
  },
  {
    slug: 'grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto',
    name: 'XPLORE',
    note: 'Over-frame utility',
    image: `${productBase}/products/xplore_transparent.png`,
    href: '/products/grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto'
  },
  {
    slug: 'grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike',
    name: 'XPLUS',
    note: 'Full-suspension comfort',
    image: `${productBase}/products/xplus_transparent.png`,
    href: '/products/grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike'
  }
];

function priceFor(catalog: Awaited<ReturnType<typeof listPublicProducts>>, slug: string) {
  return catalog.find((product) => product.slug === slug)?.price || 'View current price';
}

export default async function PrecisionHomepage() {
  const [catalog, articles] = await Promise.all([listPublicProducts(), getAllNewsArticles()]);
  const latestNews = articles.slice(0, 3);

  return (
    <main className={styles.page}>
      <PrecisionStorefrontHeader />

      <section className={styles.hero}>
        <Image
          className={styles.heroBackground}
          src="/homepage-precision/precision-studio-hero.webp"
          alt="Silver automotive studio"
          fill
          priority
          sizes="100vw"
        />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>XTREME 96V</p>
          <h1>ENGINEERED<br />FOR THE<br />UNPAVED.</h1>
          <p className={styles.heroText}>Precision-built electric mobility for trails, streets and everyday independence.</p>
          <div className={styles.heroCtas}>
            <Link className={styles.primaryButton} href="/products/cheerdmoto-performance-96v-electric-dirtbike-xtreme">Configure your ride</Link>
            <Link className={styles.textLink} href="#compare-models">Compare models <span aria-hidden="true">→</span></Link>
          </div>
          <dl className={styles.heroSpecs}>
            <div><dt>Peak power</dt><dd>15,000W</dd></div>
            <div><dt>Top speed</dt><dd>72 MPH</dd></div>
            <div><dt>Platform</dt><dd>96V</dd></div>
          </dl>
        </div>
        <div className={styles.heroProduct}>
          <Image
            src={`${productBase}/products/xtreme_transparent.png`}
            alt="COWIN XTREME 96V electric dirt bike"
            fill
            priority
            sizes="(max-width: 760px) 96vw, 58vw"
          />
        </div>
      </section>

      <section className={styles.assuranceStrip} aria-label="Purchase assurances">
        <div><strong>Free U.S. shipping</strong><span>Contiguous states</span></div>
        <div><strong>14-day returns</strong><span>Clear return window</span></div>
        <div><strong>Lifetime support</strong><span>After-sales assistance</span></div>
        <div><strong>Secure checkout</strong><span>Protected payment flow</span></div>
      </section>

      <section className={styles.compare} id="compare-models">
        <div className={styles.sectionIntro}>
          <h2>Choose the machine<br />that fits the ride.</h2>
          <p>Two trail platforms and one road-ready option, presented with the specifications that matter first.</p>
        </div>
        <div className={styles.modelGrid}>
          {models.map((model, index) => (
            <Link className={`${styles.modelCard} ${index === 0 ? styles.modelCardLead : ''}`} href={model.href} key={model.slug}>
              <div className={styles.modelImage}>
                <Image src={model.image} alt={`${model.name} electric mobility product`} fill sizes={index === 0 ? '(max-width: 760px) 92vw, 48vw' : '(max-width: 760px) 92vw, 26vw'} />
              </div>
              <div className={styles.modelMeta}>
                <div><h3>{model.name}</h3><p>{model.note}</p></div>
                <strong>{priceFor(catalog, model.slug)}</strong>
              </div>
              <ul>{model.specs.map((spec) => <li key={spec}>{spec}</li>)}</ul>
              <span className={styles.cardAction}>View model <b aria-hidden="true">→</b></span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.xceedStory}>
        <Image className={styles.testingBackground} src="/homepage-precision/precision-testing-bay.webp" alt="Graphite electric vehicle testing bay" fill sizes="100vw" />
        <div className={styles.xceedProduct}>
          <Image src={`${productBase}/products/xceed_transparent.png`} alt="COWIN XCEED 72V electric dirt bike" fill sizes="(max-width: 760px) 94vw, 56vw" />
        </div>
        <div className={styles.xceedCopy}>
          <p className={styles.darkEyebrow}>XCEED 72V</p>
          <h2>CONTROLLED POWER.<br />TRAIL-READY RESPONSE.</h2>
          <p>A balanced 72V platform for riders who want strong acceleration, confident handling and a clear upgrade path.</p>
          <dl className={styles.darkSpecs}>
            <div><dt>Peak output</dt><dd>8,500W</dd></div>
            <div><dt>Top speed</dt><dd>53 MPH</dd></div>
            <div><dt>Battery</dt><dd>30Ah</dd></div>
            <div><dt>Platform</dt><dd>72V</dd></div>
          </dl>
          <Link className={styles.outlineButton} href="/products/xceed-electric-dirt-bike">Explore XCEED</Link>
        </div>
      </section>

      <section className={styles.citySection}>
        <div className={styles.cityHeading}>
          <h2>One city.<br />Three ways through it.</h2>
          <Link className={styles.textLink} href="/e-bikes">Shop all E-bikes <span aria-hidden="true">→</span></Link>
        </div>
        <div className={styles.cityGrid}>
          {cityModels.map((model, index) => (
            <Link className={`${styles.cityCard} ${index === 1 ? styles.cityCardTall : ''}`} href={model.href} key={model.slug}>
              <div className={styles.cityProduct}>
                <Image src={model.image} alt={`${model.name} electric bike`} fill sizes="(max-width: 760px) 90vw, 32vw" />
              </div>
              <div><h3>{model.name}</h3><p>{model.note}</p><strong>{priceFor(catalog, model.slug)}</strong></div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.mobilitySection}>
        <div className={styles.mobilityCopy}>
          <p className={styles.eyebrow}>SMART B02</p>
          <h2>Independence,<br />designed around life.</h2>
          <p>Foldable mobility with intuitive control, practical range and support for everyday indoor and outdoor movement.</p>
          <dl className={styles.mobilitySpecs}>
            <div><dt>Motor</dt><dd>250W x 2</dd></div>
            <div><dt>Range</dt><dd>Up to 15 miles</dd></div>
            <div><dt>Capacity</dt><dd>350 lbs</dd></div>
          </dl>
          <Link className={styles.primaryButton} href="/products/cheerdmoto-electric-wheelchair-smart-b02">Shop SMART B02</Link>
        </div>
        <div className={styles.mobilityProduct}>
          <Image src={`${productBase}/products/smart_b02_transparent.png`} alt="COWIN SMART B02 folding electric wheelchair" fill sizes="(max-width: 760px) 88vw, 45vw" />
        </div>
      </section>

      <section className={styles.newsSection}>
        <div className={styles.newsHeading}>
          <h2>News and rider guides</h2>
          <Link className={styles.textLink} href="/news">View all news <span aria-hidden="true">→</span></Link>
        </div>
        {latestNews.length ? (
          <div className={styles.newsGrid}>
            {latestNews.map((article, index) => (
              <Link className={`${styles.newsCard} ${index === 0 ? styles.newsLead : ''}`} href={`/news/${article.slug}`} key={article.slug}>
                <div className={styles.newsImage}>
                  <Image src={article.hero} alt={article.heroAlt} fill sizes={index === 0 ? '(max-width: 760px) 92vw, 58vw' : '(max-width: 760px) 92vw, 28vw'} />
                </div>
                <div className={styles.newsCopy}>
                  <p>{article.category}</p>
                  <h3>{article.title}</h3>
                  <time dateTime={article.date}>{article.date}</time>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.newsEmpty}>
            <p>New rider stories and product guides are being prepared.</p>
            <Link href="/blog">Browse the blog</Link>
          </div>
        )}
      </section>

      <section className={styles.finalCta}>
        <div><h2>Built to move<br />on your terms.</h2><p>Compare every COWIN dirt bike, E-bike and mobility product in one catalog.</p></div>
        <Link className={styles.primaryButton} href="/products">Explore all models</Link>
      </section>

      <PrecisionStorefrontFooter />
    </main>
  );
}
