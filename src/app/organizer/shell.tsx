'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface OrganizerInfo {
  id: number;
  name: string;
  email: string;
  claimStatus: string;
}

const navItems = [
  { href: '/organizer', label: 'Dashboard', icon: '🏠' },
  { href: '/organizer/crawls', label: 'My Crawls', icon: '🍺' },
  { href: '/organizer/profile', label: 'Profile', icon: '👤' },
  { href: '/organizer/verification', label: 'Verification', icon: '✅' },
];

export function OrganizerShell({ organizer, children }: { organizer: OrganizerInfo | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isPublicPage = pathname === '/organizer/login' || pathname === '/organizer/signup';

  if (!organizer && !isPublicPage) {
    if (typeof window !== 'undefined') {
      window.location.href = '/organizer/login';
    }
    return null;
  }

  if (isPublicPage) {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch('/api/organizer/logout', { method: 'POST' });
    router.push('/organizer/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/organizer" className="text-lg font-bold text-slate-800">
              <span className="text-amber-500">🍺</span> BarCrawl
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => {
                const active = pathname === item.href || (item.href !== '/organizer' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    {item.icon} {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm text-slate-600">{organizer?.name}</span>
            <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-700 font-medium">
              Logout
            </button>
          </div>
          <button
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {navItems.map(item => {
              const active = pathname === item.href || (item.href !== '/organizer' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {item.icon} {item.label}
                </Link>
              );
            })}
            <div className="border-t border-slate-200 pt-2 mt-2 flex items-center justify-between px-3">
              <span className="text-sm text-slate-600">{organizer?.name}</span>
              <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-700 font-medium">
                Logout
              </button>
            </div>
          </div>
        )}
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
