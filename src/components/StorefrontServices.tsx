import Link from 'next/link';
import ContactInquiryForm from './ContactInquiryForm';
import {StoreArt, StorefrontV1, StoreHero, StoreIcon, StoreIntro, StoreLink, StoreTiles} from './StorefrontV1';
import {siteData} from '@/lib/site';
import {listPublicProducts} from '@/lib/publicCatalog';
import {productPresentation} from '@/lib/productPresentation';
import {modelLayout} from '@/lib/storefrontModels';
import type {ReactNode} from 'react';
import type {SiteItem} from '@/types';

const cutouts = '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets';
const supportLinks = [
  ['Manuals & assembly', 'Find guidance by model.', '/manuals', 'book-open'],
  ['Register a product', 'Have your serial number ready.', '/product-registration', 'clipboard-check'],
  ['Warranty', 'See what to prepare for a claim.', '/warranty', 'shield-check'],
  ['Shipping & returns', 'Check the delivery and returns policy.', '/shipping-returns', 'truck'],
  ['Order history', 'See order details and delivery status.', '/account/orders', 'shopping-bag'],
  ['Contact COWIN', 'Get help with a model or order.', '/support#contact', 'headphones']
] as const;
const policyLinks = [['Support', '/support'], ['Manuals & assembly', '/manuals'], ['Warranty', '/warranty'], ['Shipping & returns', '/shipping-returns'], ['Product registration', '/product-registration']] as const;

function Section({eyebrow, title, children}: {eyebrow: string; title: string; children: ReactNode}) {
  return <section className="shell section"><header className="section-head"><div><p className="kicker">{eyebrow}</p><h2>{title}</h2></div></header>{children}</section>;
}

function Steps({items}: {items: ReadonlyArray<readonly [string, string]>}) {
  return <ol className="steps">{items.map(([title, description]) => <li key={title}><div><strong>{title}</strong><p>{description}</p></div></li>)}</ol>;
}

async function FormPage({variant, requestedProduct}: {variant: 'support' | 'dealer' | 'registration'; requestedProduct: string}) {
  const design = {
    support: {eyebrow: 'COWIN service', title: 'How can we help?', description: 'Find a manual, register a product, review a policy or send a support request.', formTitle: 'Send a support request', submit: 'Send request', action: 'Contact support', id: 'contact', art: <StoreArt icon="headphones" />},
    dealer: {eyebrow: 'Partner with COWIN', title: 'Dealer Program.', description: 'Tell us about your business, territory and product interests so COWIN can route your inquiry.', formTitle: 'Dealer inquiry', submit: 'Send dealer inquiry', action: 'Start a dealer inquiry', id: 'application', art: <StoreArt image="/homepage-precision/precision-testing-bay.webp" photo />},
    registration: {eyebrow: 'Ownership', title: 'Register your product.', description: 'Use the product label to find your model and serial number before you start.', formTitle: 'Product details', submit: 'Submit registration request', action: 'Open registration form', id: 'register', art: <StoreArt icon="clipboard-check" />}
  }[variant];
  const catalog = variant === 'dealer' ? await listPublicProducts() : siteData.products;
  const productOptions = catalog.map((item) => modelLayout(item.slug)?.title || item.title);
  const selection = catalog.find((item) => item.slug === requestedProduct);
  const preselected = selection ? modelLayout(selection.slug)?.title || selection.title : '';
  return <>
    <StoreHero eyebrow={design.eyebrow} title={design.title} description={design.description} art={design.art} tight><StoreLink href={`#${design.id}`} primary arrow>{design.action}</StoreLink></StoreHero>
    {variant === 'support' && <Section eyebrow="Find help" title="Choose a topic"><StoreTiles items={supportLinks} /></Section>}
    <section id={design.id} className="shell section split">
      <div>
        <p className="kicker">{variant === 'registration' ? 'Before you start' : variant === 'dealer' ? 'How it works' : 'Contact'}</p>
        <h2>{variant === 'registration' ? 'Have these details ready' : variant === 'dealer' ? 'Start a conversation' : 'Talk to COWIN'}</h2>
        {variant === 'registration' ? <Steps items={[['Model name', 'Choose the model that matches your product.'], ['Serial number', 'Check the product label or original paperwork.'], ['Purchase details', 'Have the purchase date and order number available.']]} />
          : variant === 'dealer' ? <Steps items={[['Tell us about your business', 'Include the destination market and estimated order quantity.'], ['Ask for a product and supply quote', 'Confirm model compatibility, minimum order, pricing and lead time.'], ['Confirm delivery and documentation', 'Ask about freight terms, model documentation and after-sales support for your market.']]} />
          : <p className="lead">Include your model and order number if available. For a technical issue, describe what happened and when.</p>}
      </div>
      <div className="panel"><h3>{design.formTitle}</h3><ContactInquiryForm key={preselected} variant={variant} preselectedProduct={preselected} copy={{
        fields: {name: 'Name', email: variant === 'dealer' ? 'Business email' : 'Email', phone: 'Phone / WhatsApp', company: 'Company', country: 'Country / region', buyerType: 'Topic', product: variant === 'registration' ? 'Model' : 'Product', quantity: 'Quantity', market: 'Target market', message: variant === 'dealer' ? 'Tell us about your business' : 'How can we help?', submit: design.submit},
        buyerTypes: ['Product support', 'Order status', 'Warranty / service', 'Shipping & returns', 'Other'],
        productOptions: variant === 'registration' ? productOptions : [...productOptions, 'General inquiry']
      }} /></div>
    </section>
  </>;
}

function Policy({route, section}: {route: string; section: string}) {
  const shipping = route === '/shipping-returns';
  const returns = section === 'returns';
  return <>
    <StoreIntro eyebrow={shipping ? 'Customer policy' : 'After-sales support'} title={shipping ? 'Shipping & returns' : 'Warranty'}>
      {shipping ? 'Delivery and return information for orders placed through COWIN.' : 'Find the next step for warranty questions about your COWIN product.'}
    </StoreIntro>
    <section className="shell section readgrid">
      <nav className="sidenav" aria-label="Support pages">{policyLinks.map(([label, href]) => <Link key={href} href={href} aria-current={route === href ? 'page' : undefined}>{label}</Link>)}</nav>
      <div>
        {shipping ? <>
          <nav className="tabbar" aria-label="Policy sections">
            <Link id="shipping-policy" href="/shipping-returns#shipping-policy" aria-current={!returns ? 'page' : undefined}>Shipping</Link>
            <Link id="return-policy" href="/shipping-returns?section=returns#return-policy" aria-current={returns ? 'page' : undefined}>Returns</Link>
          </nav>
          <div className="pane" id="policy-details"><section className="panel">
            <h2>{returns ? '14-day return window' : 'Free shipping in the contiguous United States'}</h2>
            <p>{returns ? 'Contact COWIN to request a return within 14 days of delivery. Wait for return instructions and authorization before sending an item back.' : 'Free shipping applies to orders delivered to the 48 contiguous U.S. states. Delivery availability and product-specific handling requirements are confirmed during checkout.'}</p>
            <div className="actions"><StoreLink primary arrow href="/support#contact">{returns ? 'Request return guidance' : 'Contact shipping support'}</StoreLink></div>
          </section></div>
        </> : <>
          <section className="panel"><h2>Warranty support by model</h2><p>Contact COWIN to confirm coverage and service terms for your model and order.</p><Steps items={[
            ['Find your order and serial number', 'Keep the model and proof of purchase handy.'],
            ['Describe the issue', 'Include when the issue started and clear photos when relevant.'],
            ['Request service guidance', 'COWIN can review the details and advise on next steps.']
          ]} /><StoreLink primary arrow href="/support#contact">Contact warranty support</StoreLink></section>
          <section className="panel"><h3>Common questions</h3>
            <details><summary>Where can I find setup guidance?</summary><p>Start with the model directory in <Link className="inline" href="/manuals">Manuals &amp; assembly</Link>.</p></details>
            <details><summary>What details should I include?</summary><p>Share your product model, serial number, order details and a description of the issue.</p></details>
          </section>
        </>}
      </div>
    </section>
  </>;
}

function Manuals({query}: {query: string}) {
  const models = siteData.products.map(productPresentation).filter(({categoryRoute, displayName}) => categoryRoute !== '/accessories' && displayName.toLowerCase().includes(query.toLowerCase()));
  return <>
    <StoreIntro eyebrow="Owner resources" title="Manuals & assembly">Start with the model on your product label. Verify setup and maintenance guidance for that exact model.</StoreIntro>
    <Section eyebrow="Model directory" title="Find your model">
      <form action="/manuals" className="searchfield"><input type="search" name="q" aria-label="Filter models" placeholder="Try XCEED or SMART B02" defaultValue={query} /><button className="button primary">Search</button></form>
      <div className="resultlist sf-spaced">{models.map((model) => <div key={model.model} className="result"><div><p className="kicker">{model.category}</p><strong>{model.model}</strong><p>{model.shortDescription}</p></div><StoreLink href="/support#contact">Ask for manual</StoreLink></div>)}</div>
      {!models.length && <p>No matching models. Try a shorter model name.</p>}
    </Section>
  </>;
}

function BrandPage({slug}: {slug: string}) {
  if (slug === 'about') return <>
    <StoreHero eyebrow="About COWIN" title="Electric mobility, built for the way you move." description="Explore COWIN across performance riding, daily utility and everyday mobility." art={<StoreArt image="/precision-storefront/precision-gallery.webp" photo />}><StoreLink href="/products" primary arrow>Explore the lineup</StoreLink></StoreHero>
    <Section eyebrow="The lineup" title="Three ways to move"><StoreTiles items={[
      ['Off-road performance', 'Compare XCEED and XTREME.', '/electric-dirt-bikes', 'zap'],
      ['Everyday electric bikes', 'Find a frame and setup that suit your ride.', '/e-bikes', 'bike'],
      ['Electric wheelchairs', 'Explore compact folding mobility.', '/electric-wheelchairs', 'move']
    ]} /></Section>
    <section className="shell section"><div className="feature"><StoreArt image="/homepage-precision/precision-testing-bay.webp" photo /><div className="feature-copy"><p className="kicker">COWIN ownership</p><h2>From choosing a model to getting support.</h2><p>Find setup guidance, product registration and help for your COWIN model.</p><div className="actions"><StoreLink href="/support" primary arrow>Visit support</StoreLink><StoreLink href="/dealer-program">Dealer program</StoreLink></div></div></div></section>
  </>;
  if (slug === 'rider-club') return <>
    <StoreHero eyebrow="COWIN Rider Club" title="For the ride ahead." description="A starting point for COWIN owners to find practical resources, product stories and help." art={<StoreArt image={`${cutouts}/source/xtreme_lifestyle.webp`} alt="COWIN XTREME outdoors" photo />}><StoreLink href="/blog" primary arrow>Explore rider guides</StoreLink></StoreHero>
    <Section eyebrow="Rider resources" title="Keep your ride ready"><StoreTiles items={[
      ['Get set up', 'Find model-specific assembly guidance.', '/manuals', 'wrench'],
      ['Register your ride', 'Keep your model and serial number ready.', '/product-registration', 'clipboard-check'],
      ['Read the latest', 'See product and industry stories.', '/news', 'book-open']
    ]} /></Section>
  </>;
  return <>
    <StoreHero eyebrow="Discover" title="Explore electric mobility." description="Start with buying guides, industry news or practical ownership resources." art={<StoreArt image={`${cutouts}/products/xplore_transparent.png`} alt="XPLORE electric bike" />} tight><StoreLink href="/blog" primary arrow>Explore buying guides</StoreLink></StoreHero>
    <Section eyebrow="Explore by topic" title="What would you like to know?"><StoreTiles items={[
      ['Buying guides', 'Compare frames, features and use cases.', '/blog', 'book-open'],
      ['Industry news', 'Read updates with clear source attribution.', '/news', 'file-text'],
      ['Owner resources', 'Find setup and service guidance.', '/manuals', 'wrench'],
      ['Rider Club', 'Explore the rider community.', '/rider-club', 'users-round'],
      ['Compare models', 'See the whole COWIN lineup.', '/products', 'layers'],
      ['Talk to COWIN', 'Ask a question about a model.', '/support', 'headphones']
    ]} /></Section>
  </>;
}

export function StorefrontServices({item, section, query, requestedProduct = '', schema}: {item: SiteItem; section: string; query: string; requestedProduct?: string; schema?: ReactNode}) {
  const forms = {'support': 'support', 'dealer-program': 'dealer', 'product-registration': 'registration'} as const;
  const variant = forms[item.slug as keyof typeof forms];
  return <StorefrontV1><main>
    {schema}
    {variant ? <FormPage variant={variant} requestedProduct={requestedProduct} /> : item.slug === 'manuals' ? <Manuals query={query} />
      : ['warranty', 'shipping-returns'].includes(item.slug) ? <Policy route={item.route} section={section} />
      : <BrandPage slug={item.slug} />}
  </main></StorefrontV1>;
}
