'use client';

import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/lib/auth';

export function TopBar({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400">{user.name} ({user.role})</span>
        <button
          onClick={handleLogout}
          className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
