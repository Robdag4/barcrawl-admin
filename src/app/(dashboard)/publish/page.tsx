'use client';
import { useState, useEffect } from 'react';

type Crawl = {
  id: number; title: string; city: string | null; date: string | null;
  organizerName: string | null; internalScore: number | null;
  status: string; wpPostId: number | null;
};

export default function PublishPage() {
  const [rows, setRows] = useState<Crawl[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/publish');
    const data = await res.json();
    setRows(data.rows || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleSelect(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.id)));
  }

  async function bulkAction(action: string) {
    if (selected.size === 0) return;
    await fetch('/api/publish', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), action }),
    });
    setSelected(new Set());
    load();
  }

  const wpStatus = (row: Crawl) => {
    if (row.status === 'published' && row.wpPostId) return { label: 'Synced', cls: 'bg-green-500/20 text-green-400' };
    if (row.status === 'published') return { label: 'Needs Update', cls: 'bg-yellow-500/20 text-yellow-400' };
    return { label: 'Not Synced', cls: 'bg-slate-700 text-slate-300' };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Publish Queue</h2>
        <div className="flex gap-2">
          <button onClick={() => bulkAction('publish')} disabled={selected.size === 0} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm font-medium disabled:opacity-50">Publish Selected ({selected.size})</button>
          <button onClick={() => bulkAction('unpublish')} disabled={selected.size === 0} className="px-4 py-2 bg-red-600/20 text-red-400 rounded text-sm hover:bg-red-600/30 disabled:opacity-50">Unpublish Selected</button>
        </div>
      </div>

      {loading ? <p className="text-slate-400">Loading...</p> : rows.length === 0 ? <p className="text-slate-400">No approved crawls to publish</p> : (
        <table className="w-full text-sm text-left">
          <thead className="text-slate-400 border-b border-slate-700">
            <tr>
              <th className="py-2 px-3"><input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} className="accent-indigo-500" /></th>
              <th className="py-2 px-3">Title</th>
              <th className="py-2 px-3">City</th>
              <th className="py-2 px-3">Date</th>
              <th className="py-2 px-3">Organizer</th>
              <th className="py-2 px-3">Score</th>
              <th className="py-2 px-3">WP Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const wp = wpStatus(row);
              return (
                <tr key={row.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                  <td className="py-2 px-3"><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} className="accent-indigo-500" /></td>
                  <td className="py-2 px-3 text-slate-100 font-medium">{row.title}</td>
                  <td className="py-2 px-3 text-slate-300">{row.city || '—'}</td>
                  <td className="py-2 px-3 text-slate-300">{row.date || '—'}</td>
                  <td className="py-2 px-3 text-slate-300">{row.organizerName || '—'}</td>
                  <td className="py-2 px-3 text-slate-300 font-mono">{row.internalScore ?? '—'}</td>
                  <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${wp.cls}`}>{wp.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
