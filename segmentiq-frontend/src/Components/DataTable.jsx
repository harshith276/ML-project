import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';

// ─── Badge ────────────────────────────────────────────────────────────────────

const BADGE_STYLES = {
  Champions:   'bg-teal-100  text-teal-700  border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-500/30',
  Loyal:       'bg-blue-100  text-blue-700  border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30',
  'At-Risk':   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30',
  Hibernating: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

function Badge({ segment }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        BADGE_STYLES[segment] || BADGE_STYLES.Hibernating
      }`}
    >
      {segment || '—'}
    </span>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-white/5">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <div className="h-3 bg-slate-100 dark:bg-white/10 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const SEGMENTS  = ['All', 'Champions', 'Loyal', 'At-Risk', 'Hibernating'];

export default function DataTable() {
  const [rows,        setRows]        = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [segment,     setSegment]     = useState('All');
  const [showOutliers,setShowOutliers]= useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [isRefreshing,setIsRefreshing]= useState(false);

  // Debounced search term — avoids firing on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page:          String(page),
        page_size:     String(PAGE_SIZE),
        show_outliers: String(showOutliers),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (segment !== 'All')      params.set('segment', segment);

      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setRows(json.data);
      setTotal(json.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, segment, showOutliers]);

  // Re-fetch whenever deps change; also reset to page 1 when filters change
  useEffect(() => { fetchPage(); }, [fetchPage]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSegment = (e) => {
    setSegment(e.target.value);
    setPage(1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSearch('');
    setDebouncedSearch('');
    setSegment('All');
    setShowOutliers(false);
    setPage(1);
    await fetchPage();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Visible page numbers (window of 5)
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Raw Transaction Data</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {total.toLocaleString()} rows from PostgreSQL · AI-assigned segments
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="searchInput"
              name="searchInput"
              aria-label="Search by ID"
              placeholder="Search ID..."
              value={search}
              onChange={handleSearch}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#1A1E2E] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 w-52"
            />
          </div>

          {/* Segment filter */}
          <select
            id="segmentFilter"
            name="segmentFilter"
            aria-label="Filter by segment"
            value={segment}
            onChange={handleSegment}
            className="py-2 px-3 text-sm border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#1A1E2E] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-200"
          >
            {SEGMENTS.map(s => <option key={s}>{s}</option>)}
          </select>

          {/* Outlier toggle */}
          <label htmlFor="showOutliers" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              id="showOutliers"
              name="showOutliers"
              checked={showOutliers}
              onChange={e => { setShowOutliers(e.target.checked); setPage(1); }}
              className="rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-500 dark:bg-[#1A1E2E]"
            />
            Show outliers
          </label>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-all duration-200"
          >
            <RefreshCw size={11} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => fetchPage()}
            className="ml-auto px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white dark:bg-[#12151F] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10">
              {['Transaction ID', 'Customer ID', 'Amount', 'Date', 'Segment'].map(col => (
                <th
                  key={col}
                  className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading
              ? [...Array(PAGE_SIZE)].map((_, i) => <SkeletonRow key={i} />)
              : rows.length > 0
              ? rows.map((row, i) => (
                  <tr
                    key={row.transaction_id ? `${row.transaction_id}-${i}` : `row-${i}`}
                    className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-150"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                      {row.transaction_id || '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                      {row.customer_id || '—'}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      {row.amount != null ? `₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{formatDate(row.date)}</td>
                    <td className="px-5 py-3.5">
                      {row.is_outlier
                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-500/30">Outlier</span>
                        : <Badge segment={row.segment} />
                      }
                    </td>
                  </tr>
                ))
              : (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                      {search ? `No results matching "${search}"` : 'No transactions found.'}
                    </td>
                  </tr>
                )
            }
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-transparent">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
            </span>{' '}
            of{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">{total.toLocaleString()}</span> results
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              <ChevronLeft size={13} /> Prev
            </button>

            {pageNumbers.map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                disabled={loading}
                className={`w-7 h-7 text-xs font-medium rounded-lg transition-all duration-150 ${
                  p === page
                    ? 'bg-teal-600 text-white'
                    : 'border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
