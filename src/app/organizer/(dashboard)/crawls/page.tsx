'use client';

import { useEffect, useState } from 'react';

interface Crawl {
  id: number;
  title: string;
  city?: string;
  state?: string;
  date?: string;
  status?: string;
}

const emptyForm = { title: '', city: '', state: '', date: '', timeStart: '', timeEnd: '', price: '', ticketUrl: '', description: '', stops: '', includes: '', imageUrl: '' };

function StatusBadge({ status }: { status?: string }) {
  const s = status || 'pending';
  const colors: Record<string, string> = {
    published: 'bg-green-100 text-green-700',
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[s] || 'bg-gray-100 text-gray-600'}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

export default function CrawlsPage() {
  const [crawls, setCrawls] = useState<Crawl[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function loadCrawls() {
    fetch('/api/organizer/crawls').then(r => r.json()).then(data => setCrawls(data.crawls || [])).finally(() => setLoading(false));
  }

  useEffect(() => { loadCrawls(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/organizer/submit-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Submit failed' });
      } else {
        setMessage({ type: 'success', text: 'Crawl submitted successfully! It will be reviewed shortly.' });
        setForm(emptyForm);
        setShowForm(false);
        loadCrawls();
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">My Crawls</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          {showForm ? 'Cancel' : '+ Submit New Crawl'}
        </button>
      </div>

      {message && (
        <div className={`px-4 py-2 rounded-lg text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Submit New Crawl</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <input type="text" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
              <input type="text" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className={inputCls} placeholder="$25" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
              <input type="time" value={form.timeStart} onChange={e => setForm(f => ({ ...f, timeStart: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
              <input type="time" value={form.timeEnd} onChange={e => setForm(f => ({ ...f, timeEnd: e.target.value }))} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Ticket URL</label>
              <input type="url" value={form.ticketUrl} onChange={e => setForm(f => ({ ...f, ticketUrl: e.target.value }))} className={inputCls} placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputCls} h-20 resize-y`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Number of Stops</label>
              <input type="number" value={form.stops} onChange={e => setForm(f => ({ ...f, stops: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Includes</label>
              <input type="text" value={form.includes} onChange={e => setForm(f => ({ ...f, includes: e.target.value }))} className={inputCls} placeholder="Drinks, food, etc." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
              <input type="url" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg disabled:opacity-50 transition-colors">
                {submitting ? 'Submitting...' : 'Submit Crawl'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Loading...</div>
      ) : crawls.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center">
          <p className="text-slate-500 mb-4">You haven&apos;t submitted any crawls yet.</p>
          <button onClick={() => setShowForm(true)} className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
            Submit your first crawl →
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {crawls.map(crawl => (
            <div key={crawl.id} className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{crawl.title}</h3>
                <p className="text-sm text-slate-500">
                  {[crawl.city, crawl.state].filter(Boolean).join(', ')}
                  {crawl.date && ` • ${crawl.date}`}
                </p>
              </div>
              <StatusBadge status={crawl.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
