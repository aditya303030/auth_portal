'use client';

import Image from 'next/image';

export default function AuthLayout({ children, logo = 'circle', compactBrand = false }) {
  const logoProps = logo === 'wordmark'
    ? {
        className: 'brand-wordmark',
        src: '/black-brand-wordmark.png',
        width: 730,
        height: 114,
      }
    : {
        className: 'brand-emblem',
        src: '/black-brand-circle-wordmark.png',
        width: 824,
        height: 824,
      };

  return (
    <div className="auth-root">
      <div className="auth-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="grid-overlay" />
      </div>
      <div className="auth-card">
        <div className={`brand ${compactBrand ? 'brand-compact' : ''}`}>
          <Image
            {...logoProps}
            alt="Black Brand"
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );
}
