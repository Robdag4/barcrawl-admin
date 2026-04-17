'use client';
import { useState, useEffect, useCallback } from 'react';

type Candidate = {
  id: number; title: string; sourceUrl: string | null; sourcePlatform: string | null;
  city: string | null; state: string | null; neighborhood: string | null;
  date: string | null; timeStart: string | null; timeEnd: string | null;
  price: string | null; organizerName: string | null; ticketUrl: string | null;
  imageUrl: string | null; description: string | null; stops: number | null;
  includes: string | null; confidence: number | null; status: string;
  wpPostId: number | null; duplicateOfId: number | null; notes: string | null;
  createdAt: string;
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  published: 'bg-indigo-500/20 text-indigo-400',
};

export default function IngestionPage() {
  const [rows, setRows] = useState<Candidate[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [dupeTarget, setDupeTarget] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterCity) params.set('city', filterCity);
    if (filterPlatform) params.set('platform', filterPlatform);
    const res = await fetch(`/api/ingestion?${params}`);
    const data = await res.json();
    setRows(data.rows || []);
    setCities(data.cities || []);
    setPlatforms(data.platforms || []);
    setLoading(false);
  }, [filterStatus, filterCity, filterPlatform]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: number, status: string) {
    await fetch('/api/ingestion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function markDuplicate(id: number, duplicateOfId: number) {
    await fetch('/api/ingestion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'rejected', duplicateOfId }),
    });
    setDupeTarget(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Ingestion</h2>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium">Add Candidate</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300">
          <option value="">All Statuses</option>
          {['pending','approved','rejected','published'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300">
          <option value="">All Cities</option>
          {cities.map(c => <option key={c} value={c!}>{c}</option>)}
        </select>
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300">
          <option value="">All Platforms</option>
          {platforms.map(p => <option key={p} value={p!}>{p}</option>)}
        </select>
      </div>

      {loading ? <p className="text-slate-400">Loading...</p> : rows.length === 0 ? <p className="text-slate-400">No items</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-slate-400 border-b border-slate-700">
              <tr>
                <th className="py-2 px-3">Title</th>
                <th className="py-2 px-3">City</th>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Organizer</th>
                <th className="py-2 px-3">Source</th>
                <th className="py-2 px-3">Confidence</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <Fragment key={row.id}>
                  <tr className="border-b border-slate-700/50 hover:bg-slate-800/50 cursor-pointer" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                    <td className="py-2 px-3 text-slate-100 font-medium max-w-[200px] truncate">{row.title}</td>
                    <td className="py-2 px-3 text-slate-300">{row.city || '—'}</td>
                    <td className="py-2 px-3 text-slate-300">{row.date || '—'}</td>
                    <td className="py-2 px-3 text-slate-300">{row.organizerName || '—'}</td>
                    <td className="py-2 px-3 text-slate-300">{row.sourcePlatform || '—'}</td>
                    <td className="py-2 px-3 text-slate-300">{row.confidence ?? '—'}</td>
                    <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[row.status] || 'bg-slate-700 text-slate-300'}`}>{row.status}</span></td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {row.status === 'pending' && <>
                          <button onClick={() => updateStatus(row.id, 'approved')} className="px-2 py-1 text-xs bg-green-600/20 text-green-400 rounded hover:bg-green-600/30">Approve</button>
                          <button onClick={() => updateStatus(row.id, 'rejected')} className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30">Reject</button>
                        </>}
                        <button onClick={() => setDupeTarget(row.id)} className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600">Dupe</button>
                      </div>
                    </td>
                  </tr>
                  {expanded === row.id && (
                    <tr className="bg-slate-800/30">
                      <td colSpan={8} className="p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><span className="text-slate-400">Description:</span> <span className="text-slate-200">{row.description || '—'}</span></div>
                          <div><span className="text-slate-400">State:</span> <span className="text-slate-200">{row.state || '—'}</span></div>
                          <div><span className="text-slate-400">Neighborhood:</span> <span className="text-slate-200">{row.neighborhood || '—'}</span></div>
                          <div><span className="text-slate-400">Time:</span> <span className="text-slate-200">{row.timeStart || '?'} – {row.timeEnd || '?'}</span></div>
                          <div><span className="text-slate-400">Price:</span> <span className="text-slate-200">{row.price || '—'}</span></div>
                          <div><span className="text-slate-400">Stops:</span> <span className="text-slate-200">{row.stops ?? '—'}</span></div>
                          <div><span className="text-slate-400">Includes:</span> <span className="text-slate-200">{row.includes || '—'}</span></div>
                          <div><span className="text-slate-400">Ticket URL:</span> <span className="text-slate-200">{row.ticketUrl ? <a href={row.ticketUrl} target="_blank" className="text-indigo-400 underline">{row.ticketUrl}</a> : '—'}</span></div>
                          <div><span className="text-slate-400">Source URL:</span> <span className="text-slate-200">{row.sourceUrl ? <a href={row.sourceUrl} target="_blank" className="text-indigo-400 underline">{row.sourceUrl}</a> : '—'}</span></div>
                          <div><span className="text-slate-400">Notes:</span> <span className="text-slate-200">{row.notes || '—'}</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dupe Modal */}
      {dupeTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDupeTarget(null)}>
          <div className="bg-slate-800 rounded-lg p-6 w-96 max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">Mark as Duplicate Of</h3>
            <p className="text-sm text-slate-400 mb-3">Select the original candidate:</p>
            {rows.filter(r => r.id !== dupeTarget).map(r => (
              <button key={r.id} onClick={() => markDuplicate(dupeTarget, r.id)} className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-sm text-slate-200 mb-1">
                #{r.id} — {r.title} ({r.city})
              </button>
            ))}
            <button onClick={() => setDupeTarget(null)} className="mt-3 w-full px-3 py-2 bg-slate-700 rounded text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && <AddCandidateModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

import { Fragment } from 'react';

function AddCandidateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, string>>({ title: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.title) return;
    setSaving(true);
    await fetch('/api/ingestion', {
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
      <div className="bg-slate-800 rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Add Crawl Candidate</h3>
        <div className="grid grid-cols-2 gap-3">
          {field('Title *', 'title')}
          {field('City', 'city')}
          {field('State', 'state')}
          {field('Date', 'date')}
          {field('Organizer', 'organizerName')}
          {field('Source Platform', 'sourcePlatform')}
          {field('Source URL', 'sourceUrl')}
          {field('Ticket URL', 'ticketUrl')}
          {field('Price', 'price')}
          {field('Stops', 'stops')}
          {field('Time Start', 'timeStart')}
          {field('Time End', 'timeEnd')}
        </div>
        <div className="mt-3">
          <label className="text-xs text-slate-400">Description</label>
          <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 mt-1 h-20" />
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded text-sm">Cancel</button>
          <button onClick={save} disabled={saving || !form.title} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
