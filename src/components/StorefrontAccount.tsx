import type {ReactNode} from 'react';
import Link from 'next/link';
import AccountAuthForm from './AccountAuthForm';
import {StoreIcon, StoreLink} from './StorefrontV1';
import {modelLayout} from '@/lib/storefrontModels';
import type {StoreOrder} from '@/lib/commerceStore';

const accountPages = [
  ['Overview', '/account'],
  ['Orders', '/account/orders'],
  ['Profile', '/account/profile'],
  ['Security', '/account/security']
] as const;

export function StoreAccountContent({active, children}: {active: string; children: ReactNode}) {
  return <main className="shell section readgrid account">
    <nav className="sidenav" aria-label="Customer account">{accountPages.map(([label, href]) => <Link href={href} key={href} aria-current={active === href ? 'page' : undefined}>{label}</Link>)}</nav>
    <div className="content">{children}</div>
  </main>;
}

export function StoreAuthPage({mode, token}: {mode: 'login' | 'register' | 'forgot' | 'reset'; token?: string}) {
  const content = {
    login: ['Sign in to COWIN', 'Access your orders and account details.'],
    register: ['Create your account', 'Set up your COWIN account to manage orders and profile details.'],
    forgot: ['Reset your password', 'Enter the email address associated with your COWIN account.'],
    reset: ['Set a new password', 'Choose a new password for your COWIN account.']
  }[mode];
  return <main className="auth">
    <div className="auth-content"><div className="sf-auth-form">
      <p className="kicker">{mode === 'login' || mode === 'register' ? 'Customer account' : 'Account security'}</p>
      <h1>{content[0]}</h1><p>{content[1]}</p><AccountAuthForm mode={mode} token={token} />
      <div className="actions">
        {mode === 'login' ? <><Link className="inline" href="/account/forgot-password">Forgot password?</Link><Link className="inline" href="/account/register">Create account</Link></>
          : <Link className="inline" href="/account/login">Back to sign in</Link>}
      </div>
    </div></div>
    <aside className="auth-side"><p className="kicker">COWIN / Ownership</p><h2>Your COWIN, in one place.</h2><p>Manage orders, account details and owner support.</p></aside>
  </main>;
}


export function StoreOrderRows({orders, title, children}: {orders: StoreOrder[]; title: string; children?: ReactNode}) {
  return <section className="panel sf-spaced">
    <h2 className="sf-order-title">{title}</h2>
    {orders.length > 0 ? <div className="order-list">{orders.map((order) => {
      const status = order.shipmentStatus && order.shipmentStatus !== 'unshipped' ? order.shipmentStatus : order.status;
      const model = modelLayout(order.productSlug)?.title || order.productName;
      return <article className="orderline" key={order.id}>
        <div><strong>{order.id}</strong><p className="small">{model} · {order.createdAt.slice(0, 10)}</p></div>
        <span className={`status${status === 'delivered' ? '' : ' neutral'}`}>{status.replaceAll('_', ' ')}</span>
        <StoreLink href={`/account/orders/${encodeURIComponent(order.id)}`}>Details</StoreLink>
      </article>;
    })}</div> : <div className="empty">
      <span className="state-symbol"><StoreIcon name="package" /></span>
      <h2>No orders yet</h2><p>Orders placed with this email will appear here after checkout.</p>
      <StoreLink href="/products" primary arrow>Browse products</StoreLink>
    </div>}
    {children}
  </section>;
}
