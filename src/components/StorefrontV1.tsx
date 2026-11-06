import Image from 'next/image';
import Link from 'next/link';
import type {ReactNode} from 'react';
import DetailsMenu from './DetailsMenu';
import '@/app/storefront-v1.css';

const navigation = [
  ['Dirt bikes', '/electric-dirt-bikes'],
  ['E-bikes', '/e-bikes'],
  ['Mobility', '/electric-wheelchairs'],
  ['Accessories', '/accessories'],
  ['News', '/news'],
  ['Support', '/support']
] as const;

export function StoreIcon({name, loading}: {name: string; loading?: 'eager' | 'lazy'}) {
  return <Image className="sf-icon" src={`/storefront-icons/${name}.svg`} alt="" width={24} height={24} loading={loading} aria-hidden="true" unoptimized />;
}

export function StoreLink({href, children, primary = false, arrow = false}: {
  href: string; children: ReactNode; primary?: boolean; arrow?: boolean;
}) {
  return <Link href={href} className={`button ${primary ? 'primary' : 'secondary'}`}>{children}{arrow ? <StoreIcon name="arrow-right" /> : null}</Link>;
}

export function StorefrontV1({children, className = ''}: {children: ReactNode; className?: string}) {
  return (
    <div className={`storefront-v1 ${className}`} data-storefront-design="precision-gallery">
      <a className="sf-skip" href="#storefront-content">Skip to content</a>
      <header className="header">
        <Link href="/" className="sf-brand" aria-label="COWIN home">COWIN</Link>
        <nav className="nav" aria-label="Main navigation">{navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <div className="tools">
          <Link href="/search" aria-label="Search"><StoreIcon name="search" /></Link>
          <Link href="/account" aria-label="Account"><StoreIcon name="user-round" /></Link>
          <Link href="/cart" aria-label="Cart"><StoreIcon name="shopping-bag" /></Link>
          <DetailsMenu className="sf-mobile-menu" label="Menu" trigger={<StoreIcon name="menu" />}>
            <nav aria-label="Mobile navigation">{navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
          </DetailsMenu>
        </div>
      </header>
      <div id="storefront-content" tabIndex={-1}>{children}</div>
      <footer className="footer">
        <div className="shell footer-inner">
          <div><Link href="/" className="sf-brand">COWIN</Link><p>Electric mobility, engineered for everyday use.</p><a href="mailto:info@cheerdmotos.com">info@cheerdmotos.com</a></div>
          <nav aria-label="Explore COWIN"><strong>Explore</strong><Link href="/products">All products</Link><Link href="/discover">Discover</Link><Link href="/about">About COWIN</Link><Link href="/dealer-program">Dealer program</Link></nav>
          <nav aria-label="Help"><strong>Help</strong><Link href="/support">Contact support</Link><Link href="/manuals">Manuals &amp; assembly</Link><Link href="/shipping-returns">Shipping &amp; returns</Link><Link href="/warranty">Warranty</Link></nav>
        </div>
      </footer>
    </div>
  );
}

export function StoreIntro({eyebrow, title, children}: {eyebrow: string; title: string; children?: ReactNode}) {
  return <section className="shell catalog-head"><p className="kicker">{eyebrow}</p><h1>{title}</h1>{children && <p className="lead">{children}</p>}</section>;
}

export function StoreHero({eyebrow, title, description, art, children, tight = false}: {
  eyebrow: string; title: string; description: string; art: ReactNode; children?: ReactNode; tight?: boolean;
}) {
  return <section className={`hero${tight ? ' tight' : ''}`}><div className="shell hero-inner"><div><p className="kicker">{eyebrow}</p><h1>{title}</h1><p className="lead">{description}</p>{children && <div className="actions">{children}</div>}</div>{art}</div></section>;
}

export function StoreArt({image, icon, alt = '', photo = false}: {image?: string; icon?: string; alt?: string; photo?: boolean}) {
  if (image && photo) return <Image src={image} alt={alt} className="hero-photo art" width={720} height={420} sizes="(max-width: 700px) 100vw, 42vw" />;
  return <div className={`hero-art art${image ? '' : ' iconart'}`}>{image
    ? <Image src={image} alt={alt} width={720} height={420} sizes="(max-width: 700px) 100vw, 42vw" />
    : <StoreIcon name={icon || 'box'} />}</div>;
}

export function StoreTiles({items}: {items: ReadonlyArray<readonly [title: string, description: string, href: string, icon: string]>}) {
  return <div className="linkgrid">{items.map(([title, description, href, icon]) => <Link className="linktile" key={href} href={href}><StoreIcon name={icon} /><span><strong>{title}</strong><small>{description}</small></span><StoreIcon name="arrow-right" /></Link>)}</div>;
}

export function StoreState({eyebrow, title, description, icon, children}: {
  eyebrow: string; title: string; description: string; icon: string; children?: ReactNode;
}) {
  return <section className="shell section"><div className="state"><span className="state-symbol"><StoreIcon name={icon} /></span><p className="kicker">{eyebrow}</p><h1>{title}</h1><p className="lead">{description}</p>{children}</div></section>;
}
