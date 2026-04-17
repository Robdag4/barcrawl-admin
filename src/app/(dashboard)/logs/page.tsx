'use client';
import { useState, useEffect, useCallback } from 'react';

type LogEntry = {
  id: number; userId: number | null; action: string; entityType: string | null;
  entityId: number | null; details: unknown; createdAt: string; userName: string | null;
};

export default function LogsPage() {
  const [rows, setRows] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (filterEntity) params.set('entityType', filterEntity);
    if (filterAction) params.set('action', filterAction);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const res = await fetch(`/api/logs?${params}`);
    const data = await res.json();
    setRows(data.rows || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, filterEntity, filterAction, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Audit Logs</h2>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(1); }} className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300">
          <option value="">All Entity Types</option>
          {['crawl_candidate','organizer','venue_candidate'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }} placeholder="Filter by action..." className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300" />
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300" />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300" />
      </div>

      {loading ? <p className="text-slate-400">Loading...</p> : rows.length === 0 ? <p className="text-slate-400">No log entries</p> : (
        <>
          <table className="w-full text-sm text-left">
            <thead className="text-slate-400 border-b border-slate-700">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">User</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Entity Type</th>
                <th className="py-2 px-3">Entity ID</th>
                <th className="py-2 px-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                  <td className="py-2 px-3 text-slate-300 text-xs font-mono">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                  <td className="py-2 px-3 text-slate-300">{row.userName || row.userId || '—'}</td>
                  <td className="py-2 px-3 text-slate-100 font-medium">{row.action}</td>
                  <td className="py-2 px-3 text-slate-300">{row.entityType || '—'}</td>
                  <td className="py-2 px-3 text-slate-300 font-mono">{row.entityId ?? '—'}</td>
                  <td className="py-2 px-3 text-slate-400 text-xs max-w-[300px] truncate">{row.details ? JSON.stringify(row.details) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
            <span>{total} total entries</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 bg-slate-700 rounded disabled:opacity-50">← Prev</button>
              <span className="px-3 py-1">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 bg-slate-700 rounded disabled:opacity-50">Next →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
