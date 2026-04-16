'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: '📊 Dashboard', href: '/' },
  { label: '📥 Ingestion', href: '/ingestion' },
  { label: '🔍 Dedupe', href: '/dedupe' },
  { label: '⭐ Scoring', href: '/scoring' },
  { label: '👤 Organizers', href: '/organizers' },
  { label: '🚀 Publish', href: '/publish' },
  { label: '📋 Logs', href: '/logs' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold text-amber-500">🍺 BarCrawl</h1>
        <p className="text-xs text-slate-400">Admin Panel</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded text-sm ${
                active
                  ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
