'use client';

import { useEffect, useState } from 'react';

interface Stats {
  crawlStats: { status: string; count: number }[];
  venueStats: { status: string; count: number }[];
  organizerStats: { claimStatus: string; count: number }[];
  recentActivity: { id: number; action: string; entityType: string; entityId: number; createdAt: string }[];
}

function StatCard({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
      <h3 className="text-sm font-medium text-slate-400 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-slate-100 mb-3">{total}</p>
      <div className="space-y-1">
        {items.map(i => (
          <div key={i.label} className="flex justify-between text-sm">
            <span className="text-slate-400 capitalize">{i.label}</span>
            <span className="text-slate-300">{i.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setStats);
  }, []);

  if (!stats) return <div className="text-slate-400">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Crawl Candidates"
          items={stats.crawlStats.map(s => ({ label: s.status, count: s.count }))}
        />
        <StatCard
          title="Venue Candidates"
          items={stats.venueStats.map(s => ({ label: s.status, count: s.count }))}
        />
        <StatCard
          title="Organizers"
          items={stats.organizerStats.map(s => ({ label: s.claimStatus, count: s.count }))}
        />
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Recent Activity</h3>
        {stats.recentActivity.length === 0 ? (
          <p className="text-slate-500 text-sm">No activity yet</p>
        ) : (
          <div className="space-y-2">
            {stats.recentActivity.map(a => (
              <div key={a.id} className="text-sm text-slate-300">
                <span className="text-indigo-400">{a.action}</span>
                {a.entityType && <span className="text-slate-500"> · {a.entityType} #{a.entityId}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
