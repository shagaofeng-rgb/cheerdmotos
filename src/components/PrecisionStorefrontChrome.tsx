import Link from 'next/link';
import styles from './PrecisionStorefrontChrome.module.css';

const navigation = [
  {label: 'Dirt Bikes', href: '/electric-dirt-bikes'},
  {label: 'E-Bikes', href: '/e-bikes'},
  {label: 'Mobility', href: '/electric-wheelchairs'},
  {label: 'Accessories', href: '/accessories'},
  {label: 'News', href: '/news'},
  {label: 'Support', href: '/support'}
];

export function PrecisionStorefrontHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.logo} href="/" aria-label="CHEERDMOTO home">
        CHEERDMOTO
      </Link>
      <nav className={styles.desktopNav} aria-label="Main navigation">
        {navigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
      </nav>
      <div className={styles.actions}>
        <Link href="/search">Search</Link>
        <Link href="/account">Account</Link>
        <Link href="/cart">Cart</Link>
        <details className={styles.mobileMenu}>
          <summary aria-label="Open navigation"><span /><span /><span /></summary>
          <nav aria-label="Mobile navigation">
            {navigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
            <Link href="/search">Search</Link>
            <Link href="/account">Account</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function PrecisionStorefrontFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <Link className={styles.logo} href="/">CHEERDMOTO</Link>
        <p>Electric mobility engineered for performance, utility and everyday independence.</p>
      </div>
      <div><strong>Shop</strong><Link href="/electric-dirt-bikes">Dirt bikes</Link><Link href="/e-bikes">E-bikes</Link><Link href="/electric-wheelchairs">Mobility</Link><Link href="/accessories">Accessories</Link></div>
      <div><strong>Support</strong><Link href="/support">Contact us</Link><Link href="/manuals">Manuals</Link><Link href="/warranty">Warranty</Link><Link href="/shipping-returns">Shipping and returns</Link></div>
      <div><strong>Company</strong><Link href="/about">About</Link><Link href="/news">News</Link><Link href="/blog">Blog</Link><Link href="/dealer-program">Dealer program</Link></div>
    </footer>
  );
}
