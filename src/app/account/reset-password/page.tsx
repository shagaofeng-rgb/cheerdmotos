import {StoreAuthPage} from '@/components/StorefrontAccount';
import {StoreLink, StoreState} from '@/components/StorefrontV1';

export const dynamic = 'force-dynamic';

export default async function AccountResetPasswordPage({searchParams}: {searchParams: Promise<{token?: string}>}) {
  const {token} = await searchParams;
  return token ? <StoreAuthPage mode="reset" token={token} /> : <main>
    <StoreState eyebrow="Account security" title="Reset link unavailable" description="Request a new password reset link to continue." icon="lock-keyhole">
      <div className="actions"><StoreLink href="/account/forgot-password" primary arrow>Request new link</StoreLink><StoreLink href="/account/login">Back to sign in</StoreLink></div>
    </StoreState>
  </main>;
}
