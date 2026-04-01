'use client';

import Image from 'next/image';

export default function AuthLayout({ children }) {
  return (
    <div className="auth-root">
      <div className="auth-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="grid-overlay" />
      </div>
      <div className="auth-card">
        <div className="brand">
          <Image
            src="/black-brand-wordmark.png"
            alt="BLACK BRAND"
            width={220}
            height={54}
            priority
            className="brand-wordmark"
          />
        </div>
        {children}
      </div>
    </div>
  );
}
