'use client';
import { useState, useEffect, useCallback } from 'react';

type Org = {
  id: number; name: string; email: string | null; website: string | null;
  claimStatus: string; outreachStatus: string | null; crawlCount: number;
  createdAt: string; updatedAt: string;
};

type OrgDetail = {
  id: number; name: string; email: string | null; phone: string | null;
  website: string | null; logoUrl: string | null; bio: string | null;
  claimStatus: string; outreachStatus: string | null; outreachNotes: string | null;
  createdAt: string; updatedAt: string;
};

type Crawl = { id: number; title: string; city: string | null; date: string | null; status: string };

const claimColors: Record<string, string> = {
  unclaimed: 'bg-slate-700 text-slate-300',
  pending: 'bg-yellow-500/20 text-yellow-400',
  claimed: 'bg-green-500/20 text-green-400',
  verified: 'bg-indigo-500/20 text-indigo-400',
};

export default function OrganizersPage() {
  const [rows, setRows] = useState<Org[]>([]);
  const [filterClaim, setFilterClaim] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [crawls, setCrawls] = useState<Crawl[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [notes, setNotes] = useState('');
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterClaim) params.set('claimStatus', filterClaim);
    if (search) params.set('search', search);
    const res = await fetch(`/api/organizers?${params}`);
    const data = await res.json();
    setRows(data.rows || []);
    setLoading(false);
  }, [filterClaim, search]);

  useEffect(() => { load(); }, [load]);

  async function loadDetail(id: number) {
    setSelected(id);
    const res = await fetch(`/api/organizers?id=${id}`);
    const data = await res.json();
    setDetail(data.organizer);
    setCrawls(data.crawls || []);
    setNotes(data.organizer?.outreachNotes || '');
  }

  async function updateOrg(id: number, fields: Record<string, unknown>) {
    await fetch('/api/organizers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    });
    loadDetail(id);
    load();
  }

  async function seedOrganizers() {
    setSeeding(true);
    const res = await fetch('/api/organizers/seed', { method: 'POST' });
    const data = await res.json();
    setSeeding(false);
    alert(`Seeded ${data.created} organizers`);
    load();
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Left panel - list */}
      <div className={`${selected ? 'w-1/2' : 'w-full'} flex flex-col`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Organizers</h2>
          <div className="flex gap-2">
            <button onClick={seedOrganizers} disabled={seeding} className="px-3 py-2 bg-amber-600/20 text-amber-400 rounded text-sm hover:bg-amber-600/30 disabled:opacity-50">
              {seeding ? 'Seeding...' : 'Seed from Crawls'}
            </button>
            <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium">Add Organizer</button>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 flex-1" />
          <select value={filterClaim} onChange={e => setFilterClaim(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300">
            <option value="">All Statuses</option>
            {['unclaimed','pending','claimed','verified'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? <p className="text-slate-400">Loading...</p> : rows.length === 0 ? <p className="text-slate-400">No organizers</p> : (
          <div className="overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Website</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Crawls</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} onClick={() => loadDetail(row.id)} className={`border-b border-slate-700/50 cursor-pointer hover:bg-slate-800/50 ${selected === row.id ? 'bg-slate-800' : ''}`}>
                    <td className="py-2 px-3 text-slate-100 font-medium">{row.name}</td>
                    <td className="py-2 px-3 text-slate-300 text-xs">{row.email || '—'}</td>
                    <td className="py-2 px-3 text-slate-300 text-xs max-w-[120px] truncate">{row.website || '—'}</td>
                    <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${claimColors[row.claimStatus]}`}>{row.claimStatus}</span></td>
                    <td className="py-2 px-3 text-slate-300">{row.crawlCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right panel - detail */}
      {selected && detail && (
        <div className="w-1/2 bg-slate-800/50 rounded-lg border border-slate-700 p-5 overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-100">{detail.name}</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${claimColors[detail.claimStatus]}`}>{detail.claimStatus}</span>
            </div>
            <button onClick={() => { setSelected(null); setDetail(null); }} className="text-slate-400 hover:text-slate-200">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><span className="text-slate-400">Email:</span> <span className="text-slate-200">{detail.email || '—'}</span></div>
            <div><span className="text-slate-400">Phone:</span> <span className="text-slate-200">{detail.phone || '—'}</span></div>
            <div><span className="text-slate-400">Website:</span> <span className="text-slate-200">{detail.website ? <a href={detail.website} target="_blank" className="text-indigo-400 underline">{detail.website}</a> : '—'}</span></div>
            <div><span className="text-slate-400">Bio:</span> <span className="text-slate-200">{detail.bio || '—'}</span></div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            {detail.claimStatus === 'pending' && (
              <>
                <button onClick={() => updateOrg(detail.id, { claimStatus: 'claimed' })} className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded text-sm hover:bg-green-600/30">Approve Claim</button>
                <button onClick={() => updateOrg(detail.id, { claimStatus: 'unclaimed' })} className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded text-sm hover:bg-red-600/30">Reject Claim</button>
              </>
            )}
            {detail.claimStatus !== 'verified' && (
              <button onClick={() => updateOrg(detail.id, { claimStatus: 'verified' })} className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 rounded text-sm hover:bg-indigo-600/30">Mark Verified</button>
            )}
            {detail.claimStatus === 'verified' && (
              <button onClick={() => updateOrg(detail.id, { claimStatus: 'claimed' })} className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded text-sm hover:bg-red-600/30">Strip Verified</button>
            )}
            <button onClick={() => updateOrg(detail.id, { outreachStatus: 'sent' })} className="px-3 py-1.5 bg-amber-600/20 text-amber-400 rounded text-sm hover:bg-amber-600/30">Log Outreach</button>
          </div>

          {/* Outreach Notes */}
          <div className="mb-4">
            <label className="text-sm text-slate-400 block mb-1">Outreach Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 h-24" />
            <button onClick={() => updateOrg(detail.id, { outreachNotes: notes })} className="mt-1 px-3 py-1 bg-slate-700 rounded text-xs text-slate-300 hover:bg-slate-600">Save Notes</button>
          </div>

          {/* Associated Crawls */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Associated Crawls ({crawls.length})</h4>
            {crawls.length === 0 ? <p className="text-xs text-slate-400">No crawls linked</p> : (
              <div className="space-y-1">
                {crawls.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-xs bg-slate-900/50 rounded px-3 py-2">
                    <span className="text-slate-100 flex-1">{c.title}</span>
                    <span className="text-slate-400">{c.city}</span>
                    <span className="text-slate-400">{c.date || '—'}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${c.status === 'approved' ? 'bg-green-500/20 text-green-400' : c.status === 'published' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-300'}`}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && <AddOrgModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function AddOrgModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, string>>({ name: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name) return;
    setSaving(true);
    await fetch('/api/organizers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    onSaved();
  }

  const field = (label: string, key: string) => (
    <div key={key}>
      <label className="text-xs text-slate-400">{label}</label>
      <input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 mt-1" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-6 w-[450px]" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Add Organizer</h3>
        <div className="grid grid-cols-2 gap-3">
          {field('Name *', 'name')}
          {field('Email', 'email')}
          {field('Phone', 'phone')}
          {field('Website', 'website')}
        </div>
        <div className="mt-3">
          <label className="text-xs text-slate-400">Bio</label>
          <textarea value={form.bio || ''} onChange={e => setForm({ ...form, bio: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 mt-1 h-20" />
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded text-sm">Cancel</button>
          <button onClick={save} disabled={saving || !form.name} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
