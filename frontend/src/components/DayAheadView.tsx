import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import MetricCard from './MetricCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { useDayAhead } from '../hooks/useWindData';
import { formatMW, formatTime, formatPercent, formatNumber } from '../utils/formatters';

export default function DayAheadView() {
  const [selectedDate, setSelectedDate] = useState('2026-01-15');
  const { data, isLoading, error, refetch } = useDayAhead(selectedDate);

  // January 2026 delivery calendar
  const januaryDates = useMemo(() => {
    const dates: string[] = [];
    for (let d = 1; d <= 31; d++) {
      dates.push(`2026-01-${String(d).padStart(2, '0')}`);
    }
    return dates;
  }, []);

  const navigateDate = (direction: -1 | 1) => {
    const currentIdx = januaryDates.indexOf(selectedDate);
    const newIdx = Math.max(0, Math.min(januaryDates.length - 1, currentIdx + direction));
    setSelectedDate(januaryDates[newIdx]);
  };

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.records.map((r) => ({
      time: formatTime(r.delivery_time),
      actual: r.actual_mw,
      forecast: r.latest_forecast_mw,
      error: r.error_mw,
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Trading Desk Date Navigator & Gate Closure Status */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                UK Day-Ahead Decision Cockpit
              </h3>
              <p className="text-xs text-slate-400">
                Simulating procurement auction bids submitted prior to gate closure
              </p>
            </div>
          </div>
          
          {/* Calendar Day Switcher */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => navigateDate(-1)}
              disabled={selectedDate === januaryDates[0]}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
              title="Previous Delivery Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer"
            >
              {januaryDates.map((date) => (
                <option key={date} value={date}>
                  Delivery Date: {date}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => navigateDate(1)}
              disabled={selectedDate === januaryDates[januaryDates.length - 1]}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
              title="Next Delivery Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Operational Gate Closure Meta Bar */}
        {data && (
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Gate Closure Cutoff:</span>
              <span className="text-slate-200 font-semibold">
                {data.gate_closure.replace('T', ' ').replace('Z', ' UTC')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active Model Vintage:</span>
              <span className="text-emerald-400 font-semibold">
                {data.forecast_vintage === 'N/A' ? 'N/A' : data.forecast_vintage}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 ml-auto">
              <span>Resolution: 30-min (48 SP)</span>
            </div>
          </div>
        )}
      </div>

      {isLoading && <LoadingSpinner message={`Compiling gate-closure outturn and auction error for ${selectedDate}...`} />}
      {error && <ErrorMessage message={error.message} onRetry={() => refetch()} />}
      
      {data && (
        <>
          {/* Day Metrics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Day MAE"
              value={formatMW(data.summary.mae)}
              subtitle="Mean error deviation"
              riskStatus={data.summary.mae > 2500 ? 'caution' : 'optimal'}
            />
            <MetricCard
              title="Day MAPE"
              value={formatPercent(data.summary.mape)}
              subtitle="Percentage deviation"
              riskStatus={data.summary.mape > 20 ? 'caution' : 'optimal'}
            />
            <MetricCard
              title="Net Imbalance Bias"
              value={`${data.summary.mbe > 0 ? '+' : ''}${formatMW(data.summary.mbe)}`}
              subtitle={data.summary.mbe > 0 ? 'Surplus Procured' : 'Deficit Exposure'}
              riskStatus={Math.abs(data.summary.mbe) > 2000 ? 'caution' : 'normal'}
            />
            <MetricCard
              title="Settlement Periods"
              value={formatNumber(data.summary.n_observations)}
              subtitle="All 48 half-hours filled"
              riskStatus="normal"
            />
          </div>

          {/* Delivery Profile Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Half-Hourly Generation & Procurement Imbalance — {selectedDate}
              </h3>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="w-2.5 h-0.5 bg-sky-400" /> Actual (FUELHH)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-0.5 bg-emerald-400 border-dashed border-b border-emerald-400" /> Gate-Closure Forecast
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2 rounded-sm bg-amber-400/40" /> Imbalance MW
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 15, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="dayActualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                  stroke="#334155"
                  tickLine={false}
                />
                <YAxis
                  yAxisId="mw"
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                  stroke="#334155"
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                />
                <YAxis
                  yAxisId="error"
                  orientation="right"
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                  stroke="#334155"
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(51, 65, 85, 0.8)', 
                    borderRadius: '10px', 
                    fontSize: '12px',
                    color: '#e2e8f0'
                  }}
                  formatter={(v: number, name: string) => [formatMW(v), name]}
                />
                <Legend wrapperStyle={{ display: 'none' }} />
                
                {/* Actual Area */}
                <Area
                  yAxisId="mw"
                  type="monotone"
                  dataKey="actual"
                  name="Actual (MW)"
                  stroke="#38bdf8"
                  fill="url(#dayActualGrad)"
                  strokeWidth={2}
                  connectNulls
                />

                {/* Day-Ahead Gate-Closure Forecast */}
                <Line
                  yAxisId="mw"
                  type="monotone"
                  dataKey="forecast"
                  name="Gate-Closure Forecast (MW)"
                  stroke="#10b981"
                  strokeWidth={2.25}
                  strokeDasharray="5 3"
                  dot={false}
                  connectNulls
                />

                {/* Imbalance Bars */}
                <Bar
                  yAxisId="error"
                  dataKey="error"
                  name="Imbalance Error (MW)"
                  fill="#f59e0b"
                  fillOpacity={0.35}
                  radius={[2, 2, 0, 0]}
                />
                <ReferenceLine yAxisId="error" y={0} stroke="#475569" strokeDasharray="2 2" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Half-Hourly Auction Reconciliation Table */}
          <div className="card overflow-hidden p-0">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Settlement Period Ledger (48 Half-Hours)
              </h3>
              <span className="badge-neutral">
                Delivery Day {selectedDate}
              </span>
            </div>
            
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Period Start</th>
                    <th className="px-4 py-2.5 font-medium text-right">Gate-Closure Forecast</th>
                    <th className="px-4 py-2.5 font-medium text-right">Actual Outturn</th>
                    <th className="px-4 py-2.5 font-medium text-right">Net Imbalance</th>
                    <th className="px-4 py-2.5 font-medium text-right">Relative %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {data.records.map((record, idx) => {
                    const isHighError = record.error_mw && Math.abs(record.error_mw) > 1500;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2 text-slate-300 font-semibold">
                          {formatTime(record.delivery_time)} UTC
                        </td>
                        <td className="px-4 py-2 text-right text-emerald-400">
                          {record.latest_forecast_mw != null ? `${formatNumber(record.latest_forecast_mw)} MW` : '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-sky-400">
                          {record.actual_mw != null ? `${formatNumber(record.actual_mw)} MW` : '—'}
                        </td>
                        <td className={`px-4 py-2 text-right font-medium ${
                          record.error_mw == null ? 'text-slate-500' :
                          isHighError ? 'text-amber-400' : 'text-slate-300'
                        }`}>
                          {record.error_mw != null ? `${record.error_mw > 0 ? '+' : ''}${formatNumber(record.error_mw)} MW` : '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-400">
                          {record.error_pct != null ? formatPercent(record.error_pct) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
