const paymentBadges = [
  {
    id: 'visa',
    label: 'Visa',
    svg: (
      <>
        <text x="9" y="20" className="payment-wordmark payment-visa-text">VISA</text>
      </>
    )
  },
  {
    id: 'mastercard',
    label: 'Mastercard',
    svg: (
      <>
        <circle cx="22" cy="16" r="9" fill="#eb001b" />
        <circle cx="34" cy="16" r="9" fill="#f79e1b" opacity="0.94" />
      </>
    )
  },
  {
    id: 'amex',
    label: 'American Express',
    svg: (
      <>
        <rect x="7" y="7" width="42" height="18" rx="2.5" fill="#2e77bc" />
        <text x="11" y="19" className="payment-wordmark payment-white-text">AMEX</text>
      </>
    )
  },
  {
    id: 'jcb',
    label: 'JCB',
    svg: (
      <>
        <rect x="12" y="6" width="10" height="20" rx="2" fill="#0b8f43" />
        <rect x="22" y="6" width="10" height="20" rx="2" fill="#0d54a6" />
        <rect x="32" y="6" width="10" height="20" rx="2" fill="#d20a2e" />
        <text x="15" y="20" className="payment-wordmark payment-white-text payment-small-text">JCB</text>
      </>
    )
  },
  {
    id: 'discover',
    label: 'Discover',
    svg: (
      <>
        <text x="8" y="18" className="payment-wordmark payment-discover-text">DISCOVER</text>
        <path d="M29 23h19c-3 3-7 5-12 5-3 0-5-1-7-5Z" fill="#f58220" />
      </>
    )
  },
  {
    id: 'diners',
    label: 'Diners Club',
    svg: (
      <>
        <circle cx="28" cy="16" r="11" fill="#0b65a3" />
        <circle cx="28" cy="16" r="7" fill="#fff" />
        <path d="M27 10a7 7 0 0 0 0 12 7 7 0 0 1 0-12Zm3 0a7 7 0 0 1 0 12 7 7 0 0 0 0-12Z" fill="#0b65a3" />
      </>
    )
  }
];

export default function PaymentBadges() {
  return (
    <div className="payment-badges" role="list" aria-label="Accepted payment methods">
      {paymentBadges.map((badge) => (
        <span className="payment-badge" role="listitem" key={badge.id} aria-label={badge.label} title={badge.label}>
          <svg viewBox="0 0 56 32" aria-hidden="true" focusable="false">
            {badge.svg}
          </svg>
        </span>
      ))}
    </div>
  );
}
