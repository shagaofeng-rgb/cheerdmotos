'use client';

import type {ReactNode} from 'react';

export default function DetailsMenu({className, label, trigger, children}: {
  className: string;
  label: string;
  trigger: ReactNode;
  children: ReactNode;
}) {
  return <details className={className} onKeyDown={(event) => {
    if (event.key !== 'Escape' || !event.currentTarget.open) return;
    event.preventDefault();
    event.currentTarget.open = false;
    event.currentTarget.querySelector('summary')?.focus();
  }} onClick={(event) => {
    if (event.target instanceof Element && event.target.closest('a')) event.currentTarget.open = false;
  }}>
    <summary aria-label={label}>{trigger}</summary>
    {children}
  </details>;
}
