'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Navbar({ resultCount }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      const meta = data.user.user_metadata || {};
      const name = meta.full_name || meta.name || '';
      setFirstName(name.split(' ')[0] || '');
      // Get website from vendor profile stored in metadata or sessionStorage
      const profile = meta.vendor_profile ||
        JSON.parse(sessionStorage.getItem('vendor_profile') || '{}');
      setCompanyWebsite(profile.website || '');
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
  ];

  return (
    <>
      <style>{`
        .navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.75rem;
          height: 58px;
          border-bottom: 1px solid var(--border);
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 100;
          flex-shrink: 0;
        }

        .navbar-left {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .navbar-brand {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #2563eb;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .navbar-brand:hover { opacity: 0.75; }

        .navbar-links {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .navbar-link {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          text-decoration: none;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-sm);
          transition: all 0.15s;
        }
        .navbar-link:hover {
          background: var(--bg-subtle);
          color: var(--text);
        }
        .navbar-link.active {
          background: rgba(37,99,235,0.08);
          color: #2563eb;
          font-weight: 600;
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .navbar-greeting {
          font-size: 13px;
          color: var(--text-muted);
        }
        .navbar-greeting strong {
          color: var(--text);
          font-weight: 600;
        }

        .navbar-signout {
          font-size: 12px;
          padding: 0.35rem 0.85rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .navbar-signout:hover {
          background: var(--bg-subtle);
          border-color: var(--border-strong);
          color: var(--text);
        }

        .navbar-divider {
          width: 1px;
          height: 18px;
          background: var(--border);
        }
      `}</style>

      <nav className="navbar">
        <div className="navbar-left">
          {companyWebsite ? (
            <a
              className="navbar-brand"
              href={companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Black Brand
            </a>
          ) : (
            <span className="navbar-brand">Black Brand</span>
          )}

          <div className="navbar-links">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`navbar-link ${pathname === href ? 'active' : ''}`}
              >
                {label}
                {href === '/results' && resultCount > 0 && (
                  <span style={{
                    marginLeft: '5px',
                    fontSize: '10px',
                    background: 'rgba(37,99,235,0.1)',
                    color: '#2563eb',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    fontWeight: 600,
                  }}>{resultCount}</span>
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