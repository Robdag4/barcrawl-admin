'use client';
import { useState, useEffect } from 'react';

type Crawl = {
  id: number; title: string; city: string | null; internalScore: number | null;
  bottleCaps: string | null; scoreInputs: Record<string, number> | null; status: string;
};

const WEIGHTS = { trust: 25, completeness: 20, crawlQuality: 25, freshness: 15, popularity: 15 };

export default function ScoringPage() {
  const [rows, setRows] = useState<Crawl[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: number; score: number; caps: number; inputs: Record<string, number> } | null>(null);

  async function load() {
    const res = await fetch('/api/scoring');
    const data = await res.json();
    setRows(data.rows || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveScore() {
    if (!editing) return;
    await fetch('/api/scoring', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing.id, internalScore: editing.score, bottleCaps: editing.caps, scoreInputs: editing.inputs }),
    });
    setEditing(null);
    load();
  }

  const caps = (n: number) => '🍺'.repeat(Math.round(n)) + '○'.repeat(5 - Math.round(n));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Scoring</h2>
      {loading ? <p className="text-slate-400">Loading...</p> : rows.length === 0 ? <p className="text-slate-400">No approved crawls to score</p> : (
        <table className="w-full text-sm text-left">
          <thead className="text-slate-400 border-b border-slate-700">
            <tr>
              <th className="py-2 px-3">Title</th>
              <th className="py-2 px-3">City</th>
              <th className="py-2 px-3">Score</th>
              <th className="py-2 px-3">Bottle Caps</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                <td className="py-2 px-3 text-slate-100 cursor-pointer" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>{row.title}</td>
                <td className="py-2 px-3 text-slate-300">{row.city || '—'}</td>
                <td className="py-2 px-3 text-slate-100 font-mono">{row.internalScore ?? '—'}</td>
                <td className="py-2 px-3">{row.bottleCaps ? caps(Number(row.bottleCaps)) : '—'}</td>
                <td className="py-2 px-3">
                  <button onClick={() => {
                    const si = (row.scoreInputs || { trust: 50, completeness: 50, crawlQuality: 50, freshness: 50, popularity: 50 }) as Record<string, number>;
                    setEditing({ id: row.id, score: row.internalScore || 50, caps: Number(row.bottleCaps) || 3, inputs: si });
                  }} className="px-2 py-1 text-xs bg-indigo-600/20 text-indigo-400 rounded hover:bg-indigo-600/30">Edit Score</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-slate-800 rounded-lg p-6 w-[450px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Edit Score</h3>
            <div className="mb-4">
              <label className="text-sm text-slate-400">Overall Score: {editing.score}</label>
              <input type="range" min={0} max={100} value={editing.score} onChange={e => setEditing({ ...editing, score: Number(e.target.value) })} className="w-full mt-1" />
            </div>
            <div className="mb-4">
              <label className="text-sm text-slate-400">Bottle Caps: {caps(editing.caps)}</label>
              <input type="range" min={1} max={5} step={0.5} value={editing.caps} onChange={e => setEditing({ ...editing, caps: Number(e.target.value) })} className="w-full mt-1" />
            </div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Score Inputs</h4>
            {Object.entries(WEIGHTS).map(([key, weight]) => (
              <div key={key} className="mb-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{key} ({weight}%)</span>
                  <span>{editing.inputs[key] ?? 50}</span>
                </div>
                <input type="range" min={0} max={100} value={editing.inputs[key] ?? 50} onChange={e => setEditing({ ...editing, inputs: { ...editing.inputs, [key]: Number(e.target.value) } })} className="w-full" />
              </div>
            ))}
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setEditing(null)} className="px-4 py-2 bg-slate-700 rounded text-sm">Cancel</button>
              <button onClick={saveScore} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
