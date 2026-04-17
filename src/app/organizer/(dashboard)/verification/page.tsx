'use client';

import { useEffect, useState } from 'react';

interface Profile {
  name: string;
  claimStatus: string;
  emailVerified: boolean;
  website?: string;
}

export default function VerificationPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/organizer/me').then(r => r.json()).then(setProfile).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Loading...</div>;
  if (!profile) return <div className="text-red-600">Failed to load profile</div>;

  const slug = profile.name.toLowerCase().replace(/\s+/g, '-');
  const profileUrl = `https://barcrawl.com/organizers/${slug}`;
  const isVerified = profile.claimStatus === 'verified';

  const badgeHtml = `<a href="${profileUrl}">\n  <img src="https://barcrawl.com/badge/verified.svg" alt="Find us on Barcrawl.com" />\n</a>`;

  function copyBadge() {
    navigator.clipboard.writeText(badgeHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Get Verified</h1>

      {/* Current Status */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Current Status</h2>
        {isVerified ? (
          <div className="flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <p className="font-semibold text-green-700">Verified Organizer</p>
              <p className="text-sm text-slate-500">Your profile is verified and displays a badge.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              profile.claimStatus === 'claimed' ? 'bg-green-100 text-green-700' :
              profile.claimStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {profile.claimStatus.charAt(0).toUpperCase() + profile.claimStatus.slice(1)}
            </span>
            <p className="text-sm text-slate-500">
              {profile.claimStatus === 'claimed' ? 'Profile claimed — add a backlink to get verified!' : 'Complete the steps below to get verified.'}
            </p>
          </div>
        )}
      </div>

      {!isVerified && (
        <>
          {/* Steps */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-slate-800">How to Get Verified</h2>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <p className="font-medium text-slate-800">Make sure your profile is complete</p>
                <p className="text-sm text-slate-500">Add your website, bio, and social links on your <a href="/organizer/profile" className="text-indigo-600 hover:text-indigo-700">profile page</a>.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <p className="font-medium text-slate-800">Add a link to your Barcrawl.com profile on your website</p>
                <p className="text-sm text-slate-500">Place the badge or a text link anywhere on your site that points to:</p>
                <code className="block mt-1 bg-slate-100 text-slate-700 px-3 py-1.5 rounded text-sm break-all">{profileUrl}</code>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <p className="font-medium text-slate-800">We&apos;ll verify the backlink within 48 hours</p>
                <p className="text-sm text-slate-500">Once confirmed, your profile gets a verified badge and boosted visibility.</p>
              </div>
            </div>
          </div>

          {/* Embeddable Badge */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 mb-3">Embeddable Badge</h2>
            <p className="text-sm text-slate-500 mb-3">Copy and paste this HTML into your website:</p>
            <div className="relative">
              <pre className="bg-slate-100 text-slate-700 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">{badgeHtml}</pre>
              <button
                onClick={copyBadge}
                className="absolute top-2 right-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 px-3 py-1 rounded text-xs font-medium transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* No Website */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 mb-3">No website?</h2>
            <p className="text-sm text-slate-500 mb-3">You can still get verified by adding your Barcrawl.com link to:</p>
            <ul className="text-sm text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <span>📋</span>
                <span><strong>Eventbrite:</strong> Add your profile link to your organizer bio or event description.</span>
              </li>
              <li className="flex items-start gap-2">
                <span>📸</span>
                <span><strong>Instagram:</strong> Add your profile link to your bio or use a link-in-bio tool like Linktree.</span>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
