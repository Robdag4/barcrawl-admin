'use client';

import { useEffect, useState } from 'react';

interface ProfileData {
  name: string;
  email: string;
  phone?: string;
  website?: string;
  bio?: string;
  logoUrl?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
  };
}

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileData>({ name: '', email: '' });
  const [social, setSocial] = useState({ instagram: '', facebook: '', twitter: '', tiktok: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/organizer/me').then(r => r.json()).then((data: ProfileData) => {
      setForm(data);
      setSocial({
        instagram: data.socialLinks?.instagram || '',
        facebook: data.socialLinks?.facebook || '',
        twitter: data.socialLinks?.twitter || '',
        tiktok: data.socialLinks?.tiktok || '',
      });
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/organizer/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          website: form.website,
          bio: form.bio,
          socialLinks: social,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Save failed' });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  if (loading) return <div className="text-slate-500">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Edit Profile</h1>

      {message && (
        <div className={`px-4 py-2 rounded-lg mb-4 text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Basic Info</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={form.email} className={`${inputCls} bg-slate-50 cursor-not-allowed`} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
            <input type="url" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputCls} placeholder="https://yourcompany.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
            <textarea value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className={`${inputCls} h-24 resize-y`} placeholder="Tell people about your bar crawls..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
            <input type="url" value={form.logoUrl || ''} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} className={inputCls} placeholder="https://example.com/logo.png" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Social Links</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Instagram</label>
            <input type="text" value={social.instagram} onChange={e => setSocial(s => ({ ...s, instagram: e.target.value }))} className={inputCls} placeholder="@yourhandle" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Facebook</label>
            <input type="text" value={social.facebook} onChange={e => setSocial(s => ({ ...s, facebook: e.target.value }))} className={inputCls} placeholder="https://facebook.com/yourpage" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Twitter / X</label>
            <input type="text" value={social.twitter} onChange={e => setSocial(s => ({ ...s, twitter: e.target.value }))} className={inputCls} placeholder="@yourhandle" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">TikTok</label>
            <input type="text" value={social.tiktok} onChange={e => setSocial(s => ({ ...s, tiktok: e.target.value }))} className={inputCls} placeholder="@yourhandle" />
          </div>
        </div>

        <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
