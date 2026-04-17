'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Profile {
  name: string;
  claimStatus: string;
  emailVerified: boolean;
  website?: string;
}

interface CrawlsData {
  crawls: Array<Record<string, unknown>>;
}

function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    verified: 'bg-green-100 text-green-700',
    claimed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    unclaimed: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.unclaimed}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [crawlCount, setCrawlCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/organizer/me').then(r => r.json()),
      fetch('/api/organizer/crawls').then(r => r.json()),
    ]).then(([p, c]: [Profile, CrawlsData]) => {
      setProfile(p);
      setCrawlCount(c.crawls?.length || 0);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Loading...</div>;
  if (!profile) return <div className="text-red-600">Failed to load profile</div>;

  const isVerified = profile.claimStatus === 'verified';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Welcome back, {profile.name} 👋</h1>
        <p className="text-slate-500 mt-1">Here&apos;s your organizer dashboard overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
          <p className="text-sm text-slate-500 mb-1">Claim Status</p>
          <Badge status={profile.claimStatus} />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
          <p className="text-sm text-slate-500 mb-1">Email Verified</p>
          <span className={`text-lg font-semibold ${profile.emailVerified ? 'text-green-700' : 'text-yellow-700'}`}>
            {profile.emailVerified ? '✅ Yes' : '❌ No'}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
          <p className="text-sm text-slate-500 mb-1">Backlink Status</p>
          <span className={`text-lg font-semibold ${isVerified ? 'text-green-700' : 'text-slate-500'}`}>
            {isVerified ? '✅ Verified' : 'Not Verified'}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
          <p className="text-sm text-slate-500 mb-1">Total Crawls</p>
          <span className="text-2xl font-bold text-slate-800">{crawlCount}</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/organizer/crawls" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Submit New Crawl
          </Link>
          <Link href="/organizer/profile" className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Edit Profile
          </Link>
          <Link href="/organizer/verification" className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Get Verified
          </Link>
        </div>
      </div>

      {!isVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h3 className="font-semibold text-amber-800 mb-1">🏆 Get Verified</h3>
          <p className="text-amber-700 text-sm mb-3">
            Verified organizers get a badge on their profile and higher visibility in search results.
          </p>
          <Link href="/organizer/verification" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Learn how to get verified →
          </Link>
        </div>
      )}
    </div>
  );
}
