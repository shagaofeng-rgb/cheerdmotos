import {StorefrontV1, StoreLink, StoreState} from '@/components/StorefrontV1';

export default function NotFound() {
  return <StorefrontV1><main>
    <StoreState eyebrow="404" title="Page not found" description="The page may have moved or the link may be out of date. Search the site or browse the COWIN lineup." icon="signpost">
      <div className="actions"><StoreLink href="/search" primary arrow>Search COWIN</StoreLink><StoreLink href="/products">Browse products</StoreLink></div>
    </StoreState>
  </main></StorefrontV1>;
}
