import { useState, useEffect, useRef } from 'react';
import {
  Users, DollarSign, Clock, AlertTriangle,
  TrendingUp, TrendingDown, RefreshCw,
} from 'lucide-react';
import _Plot from 'react-plotly.js';
// CJS/ESM interop — Vite may wrap the default export in an object
const Plot = _Plot?.default ?? _Plot;
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ─── Segment colour palette ───────────────────────────────────────────────────

const SEGMENT_COLORS = {
  Champions:   '#0d9488',
  Loyal:       '#2563eb',
  'At-Risk':   '#f59e0b',
  Hibernating: '#94a3b8',
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, iconBg, label, value, sub, trendColor, trendIcon: TrendIcon }) {
  return (
    <div className="bg-white dark:bg-[#12151F] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className={`${iconBg} rounded-lg p-2.5`}>
          <Icon size={18} className="text-teal-700" strokeWidth={2} />
        </div>
        {TrendIcon && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
            <TrendIcon size={12} strokeWidth={2.5} />
            {sub}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-5 gap-4">
        <Skeleton className="col-span-3 h-96" />
        <Skeleton className="col-span-2 h-96" />
      </div>
    </div>
  );
}

// ─── Custom Tooltip for Bar Chart ─────────────────────────────────────────────

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2">
        <p className="text-xs text-slate-500">{payload[0].payload.name}</p>
        <p className="text-sm font-semibold text-slate-900">
          {payload[0].value.toLocaleString()} customers
        </p>
      </div>
    );
  }
  return null;
}

// ─── Segment Summary Table ────────────────────────────────────────────────────

function SegmentTable({ segments }) {
  const order = ['Champions', 'Loyal', 'At-Risk', 'Hibernating'];
  const sorted = [...segments].sort(
    (a, b) => order.indexOf(a.name) - order.indexOf(b.name),
  );

  return (
    <div className="bg-white dark:bg-[#12151F] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Segment Summary</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Live RFM metrics per cluster</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
            {['Segment', 'Customers', 'Avg Recency', 'Avg Frequency', 'Avg Spend'].map(col => (
              <th
                key={col}
                className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {sorted.map(seg => (
            <tr key={seg.name} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-150">
              <td className="px-4 py-3">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: (SEGMENT_COLORS[seg.name] || '#64748b') + '22',
                    color: SEGMENT_COLORS[seg.name] || '#64748b',
                  }}
                >
                  {seg.name}
                </span>
              </td>
              <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                {seg.count.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{seg.avg_recency}d</td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{seg.avg_frequency}</td>
              <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                ₹{seg.avg_monetary.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchSegments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/segments');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSegments(); }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl p-5 text-center">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Failed to load dashboard data</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
          <button
            onClick={fetchSegments}
            className="mt-3 px-4 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Build Plotly traces from live RFM points ─────────────────────────────
  const segmentLabels = [...new Set((data.rfm_points || []).map(p => p.segment))];
  const plotData = segmentLabels.map(label => {
    const pts = data.rfm_points.filter(p => p.segment === label);
    return {
      type: 'scatter3d',
      mode: 'markers',
      name: label,
      x: pts.map(p => p.monetary),
      y: pts.map(p => p.frequency),
      z: pts.map(p => p.recency),
      text: pts.map(p => `${p.customer_id}<br>₹${p.monetary} | ${p.frequency} txns | ${p.recency}d`),
      hovertemplate: '%{text}<extra>%{fullData.name}</extra>',
      marker: {
        color: SEGMENT_COLORS[label] || '#64748b',
        size: 4,
        opacity: 0.85,
        line: { color: '#fff', width: 0.5 },
      },
    };
  });

  const plotLayout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor:  'transparent',
    margin: { l: 0, r: 0, t: 10, b: 0 },
    legend: {
      x: 0, y: 1,
      bgcolor: 'rgba(255,255,255,0.85)',
      bordercolor: '#e2e8f0',
      borderwidth: 1,
      font: { family: 'Inter', size: 11, color: '#475569' },
    },
    scene: {
      xaxis: { title: { text: 'Monetary (₹)',   font: { family: 'Inter', size: 11, color: '#64748b' } }, gridcolor: '#f1f5f9', backgroundcolor: 'transparent' },
      yaxis: { title: { text: 'Frequency',       font: { family: 'Inter', size: 11, color: '#64748b' } }, gridcolor: '#f1f5f9', backgroundcolor: 'transparent' },
      zaxis: { title: { text: 'Recency (days)',  font: { family: 'Inter', size: 11, color: '#64748b' } }, gridcolor: '#f1f5f9', backgroundcolor: 'transparent' },
    },
    font: { family: 'Inter' },
  };

  // ── Bar chart data ────────────────────────────────────────────────────────
  const barData = (data.segments || []).map(s => ({ name: s.name, value: s.count }));

  return (
    <div className="p-6 space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          iconBg="bg-teal-50"
          label="Total Customers"
          value={data.total_customers.toLocaleString()}
          trendColor="text-teal-600"
          trendIcon={TrendingUp}
          sub="non-outlier"
        />
        <KpiCard
          icon={DollarSign}
          iconBg="bg-teal-50"
          label="Avg. Monetary Value"
          value={`₹${data.avg_monetary.toLocaleString()}`}
          trendColor="text-teal-600"
          trendIcon={TrendingUp}
          sub="avg spend"
        />
        <KpiCard
          icon={Clock}
          iconBg="bg-teal-50"
          label="Avg. Recency"
          value={`${data.avg_recency} days`}
          trendColor="text-teal-600"
          trendIcon={TrendingDown}
          sub="since last purchase"
        />
        <KpiCard
          icon={AlertTriangle}
          iconBg="bg-amber-50"
          label="Outliers Detected"
          value={data.outlier_count.toLocaleString()}
          trendColor="text-amber-500"
          trendIcon={TrendingUp}
          sub="excluded from clusters"
        />
      </div>

      {/* Refresh + last-update row */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-slate-400">Live data from PostgreSQL</span>
        <button
          onClick={fetchSegments}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-all duration-200"
        >
          <RefreshCw size={11} />
          Refresh
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-4">
        {/* 3D Cluster Explorer — 60% */}
        <div className="col-span-3 bg-white dark:bg-[#12151F] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">3D Cluster Explorer</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Monetary · Frequency · Recency</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-xs font-medium text-teal-600">Live Data</span>
            </div>
          </div>
          {plotData.length > 0 ? (
            <Plot
              data={plotData}
              layout={plotLayout}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%', height: '360px' }}
            />
          ) : (
            <div className="flex items-center justify-center h-72 text-slate-400 text-sm">
              No cluster data available
            </div>
          )}
        </div>

        {/* Segment Distribution — 40% */}
        <div className="col-span-2 bg-white dark:bg-[#12151F] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Segment Distribution</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Customers per segment</p>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={barData} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barData.map(entry => (
                  <Cell key={entry.name} fill={SEGMENT_COLORS[entry.name] || '#0d9488'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segment Summary Table */}
      {data.segments && data.segments.length > 0 && (
        <SegmentTable segments={data.segments} />
      )}
    </div>
  );
}
