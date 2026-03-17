'use client';

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
          <span className="brand-icon">⬡</span>
          <span className="brand-name">Portal</span>
        </div>
        {children}
      </div>
    </div>
  );
}