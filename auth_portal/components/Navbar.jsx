'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar({ resultCount }) {
  const router = useRouter();
  const pathname = usePathname();
  const [firstName, setFirstName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const meta = data.user.user_metadata || {};
      const name = meta.full_name || meta.name || '';
      setFirstName(name.split(' ')[0] || '');
      const profile = JSON.parse(sessionStorage.getItem('vendor_profile') || '{}');
      setCompanyWebsite(profile.website || meta.website || '');
    });
  }, []);

  const handleSignOut = async () => {
    sessionStorage.clear();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navLinks = [
    { href: '/results', label: 'Opportunities' },
    { href: '/saved', label: 'Saved RFPs' },
    { href: '/profile', label: 'My Profile' },
  ];

  return (
    <>
      <style>{`
        .navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          height: 64px;
          border-bottom: 1px solid var(--border);
          background: #ffffff;
          position: sticky;
          top: 0;
          z-index: 100;
          flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .navbar-left {
          display: flex;
          align-items: center;
          gap: 2.5rem;
        }

        .navbar-brand {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          transition: opacity 0.15s;
          white-space: nowrap;
        }
        .navbar-brand:hover { opacity: 0.7; }

        .navbar-brand img {
          display: block;
          width: auto;
          height: 40px;
        }

        .navbar-links {
          display: flex;
          align-items: center;
          gap: 0.15rem;
        }

        .navbar-link {
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          text-decoration: none;
          padding: 0.4rem 0.9rem;
          border-radius: 8px;
          transition: all 0.15s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .navbar-link:hover {
          background: #f3f4f6;
          color: #111827;
        }
        .navbar-link.active {
          background: rgba(37,99,235,0.08);
          color: #2563eb;
          font-weight: 600;
        }

        .nav-count {
          font-size: 11px;
          background: rgba(37,99,235,0.1);
          color: #2563eb;
          padding: 1px 7px;
          border-radius: 9999px;
          font-weight: 600;
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .navbar-greeting {
          font-size: 14px;
          color: #6b7280;
          white-space: nowrap;
        }
        .navbar-greeting strong {
          color: #111827;
          font-weight: 600;
        }

        .navbar-divider {
          width: 1px;
          height: 20px;
          background: #e5e7eb;
          flex-shrink: 0;
        }

        .navbar-signout {
          font-size: 13px;
          font-weight: 500;
          padding: 0.4rem 1rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: transparent;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
          white-space: nowrap;
        }
        .navbar-signout:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #111827;
        }
      `}</style>

      <nav className="navbar">
        <div className="navbar-left">
          {companyWebsite ? (
            <a
              className="navbar-brand"
              href={companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`}
              target="_blank" rel="noopener noreferrer"
            >
              <Image
                src="/black-brand-wordmark-navbar.png"
                alt="Black Brand"
                width={1240}
                height={184}
              />
            </a>
          ) : (
            <span className="navbar-brand">
              <Image
                src="/black-brand-wordmark-navbar.png"
                alt="Black Brand"
                width={1240}
                height={184}
              />
            </span>
          )}

          <div className="navbar-links">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href}
                className={`navbar-link ${pathname === href ? 'active' : ''}`}>
                {label}
                {href === '/results' && resultCount > 0 && (
                  <span className="nav-count">{resultCount}</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="navbar-right">
          {firstName && (
            <>
              <span className="navbar-greeting">
                Hello, <strong>{firstName}</strong>
              </span>
              <div className="navbar-divider" />
            </>
          )}
          <button className="navbar-signout" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </nav>
    </>
  );
}
