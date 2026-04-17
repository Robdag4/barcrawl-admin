'use client';
import { useState, useEffect } from 'react';

type Candidate = {
  id: number; title: string; city: string | null; date: string | null;
  organizerName: string | null; sourcePlatform: string | null; description: string | null;
  price: string | null; stops: number | null; timeStart: string | null; timeEnd: string | null;
  ticketUrl: string | null; imageUrl: string | null; includes: string | null;
  confidence: number | null; status: string;
};

type Pair = { left: Candidate; right: Candidate };

export default function DedupePage() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/dedupe');
    const data = await res.json();
    setPairs(data.pairs || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function resolve(action: string, leftId: number, rightId: number) {
    await fetch('/api/dedupe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, leftId, rightId }),
    });
    setPairs(pairs.filter(p => !(p.left.id === leftId && p.right.id === rightId)));
  }

  const Card = ({ c, label }: { c: Candidate; label: string }) => (
    <div className="flex-1 bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="text-xs text-slate-400 mb-2">{label} — #{c.id}</div>
      <h4 className="font-bold text-slate-100 mb-2">{c.title}</h4>
      <div className="grid grid-cols-2 gap-1 text-xs text-slate-300">
        <div>City: {c.city || '—'}</div>
        <div>Date: {c.date || '—'}</div>
        <div>Organizer: {c.organizerName || '—'}</div>
        <div>Source: {c.sourcePlatform || '—'}</div>
        <div>Price: {c.price || '—'}</div>
        <div>Stops: {c.stops ?? '—'}</div>
        <div>Time: {c.timeStart || '?'}–{c.timeEnd || '?'}</div>
        <div>Confidence: {c.confidence ?? '—'}</div>
      </div>
      {c.description && <p className="mt-2 text-xs text-slate-400 line-clamp-3">{c.description}</p>}
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dedupe</h2>
      {loading ? <p className="text-slate-400">Loading...</p> : pairs.length === 0 ? <p className="text-slate-400">No potential duplicates found</p> : (
        <div className="space-y-6">
          {pairs.map((pair, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
              <div className="flex gap-4 mb-4">
                <Card c={pair.left} label="Left" />
                <div className="flex items-center text-slate-500 text-2xl font-bold">vs</div>
                <Card c={pair.right} label="Right" />
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => resolve('keep_left', pair.left.id, pair.right.id)} className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded text-sm hover:bg-green-600/30">Keep Left</button>
                <button onClick={() => resolve('keep_right', pair.left.id, pair.right.id)} className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded text-sm hover:bg-green-600/30">Keep Right</button>
                <button onClick={() => resolve('merge', pair.left.id, pair.right.id)} className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 rounded text-sm hover:bg-indigo-600/30">Merge</button>
                <button onClick={() => resolve('not_dupe', pair.left.id, pair.right.id)} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600">Not a Dupe</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
