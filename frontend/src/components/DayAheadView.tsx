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
import { Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import MetricCard from './MetricCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { useDayAhead } from '../hooks/useWindData';
import { formatMW, formatTime, formatPercent, formatNumber } from '../utils/formatters';

export default function DayAheadView() {
  const [selectedDate, setSelectedDate] = useState('2026-01-15');
  const { data, isLoading, error, refetch } = useDayAhead(selectedDate);

  // Generate January 2026 dates
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
      {/* Date Navigator */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-brand-400" />
            <h3 className="text-lg font-semibold text-white">Day-Ahead Decision View</h3>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateDate(-1)}
              disabled={selectedDate === januaryDates[0]}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              {januaryDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => navigateDate(1)}
              disabled={selectedDate === januaryDates[januaryDates.length - 1]}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {data && (
          <div className="flex items-center gap-6 mt-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Gate Closure: {data.gate_closure.replace('T', ' ').replace('Z', ' UTC')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Forecast Vintage: {data.forecast_vintage === 'N/A' ? 'N/A' : new Date(data.forecast_vintage).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {isLoading && <LoadingSpinner message={`Loading day-ahead data for ${selectedDate}...`} />}
      {error && <ErrorMessage message={error.message} onRetry={() => refetch()} />}
      
      {data && (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="MAE"
              value={formatMW(data.summary.mae)}
              subtitle="Forecast error magnitude"
              trend={data.summary.mae < 500 ? 'good' : data.summary.mae < 1000 ? 'warning' : 'bad'}
            />
            <MetricCard
              title="MAPE"
              value={formatPercent(data.summary.mape)}
              subtitle="Relative error"
              trend={data.summary.mape < 10 ? 'good' : data.summary.mape < 20 ? 'warning' : 'bad'}
            />
            <MetricCard
              title="Bias"
              value={`${data.summary.mbe > 0 ? '+' : ''}${formatMW(data.summary.mbe)}`}
              subtitle={data.summary.mbe > 0 ? 'Over-forecast' : 'Under-forecast'}
              trend={Math.abs(data.summary.mbe) < 200 ? 'good' : 'warning'}
            />
            <MetricCard
              title="Periods"
              value={formatNumber(data.summary.n_observations)}
              subtitle="Matched half-hours"
              trend="neutral"
            />
          </div>

          {/* Chart */}
          <div className="card">
            <h3 className="card-header">
              Half-Hourly Forecast vs Actual — {selectedDate}
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="mw"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                />
                <YAxis
                  yAxisId="error"
                  orientation="right"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number, name: string) => [formatMW(v), name]}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  yAxisId="mw"
                  type="monotone"
                  dataKey="actual"
                  name="Actual (MW)"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  connectNulls
                />
                <Line
                  yAxisId="mw"
                  type="monotone"
                  dataKey="forecast"
                  name="Day-Ahead Forecast (MW)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  strokeDasharray="6 3"
                  dot={false}
                  connectNulls
                />
                <Bar
                  yAxisId="error"
                  dataKey="error"
                  name="Error (MW)"
                  fill="#ef4444"
                  fillOpacity={0.3}
                  radius={[2, 2, 0, 0]}
                />
                <ReferenceLine yAxisId="error" y={0} stroke="#374151" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
          <div className="card overflow-hidden">
            <h3 className="card-header">Half-Hourly Detail</h3>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium text-xs">Time</th>
                    <th className="text-right px-4 py-2.5 text-gray-400 font-medium text-xs">Forecast (MW)</th>
                    <th className="text-right px-4 py-2.5 text-gray-400 font-medium text-xs">Actual (MW)</th>
                    <th className="text-right px-4 py-2.5 text-gray-400 font-medium text-xs">Error (MW)</th>
                    <th className="text-right px-4 py-2.5 text-gray-400 font-medium text-xs">Error %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {data.records.map((record, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs text-gray-300">
                        {formatTime(record.delivery_time)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs text-amber-400">
                        {record.latest_forecast_mw != null ? formatNumber(record.latest_forecast_mw) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs text-cyan-400">
                        {record.actual_mw != null ? formatNumber(record.actual_mw) : '—'}
                      </td>
                      <td className={`px-4 py-2 text-right font-mono text-xs ${
                        record.error_mw == null ? 'text-gray-500' :
                        Math.abs(record.error_mw) < 300 ? 'text-emerald-400' :
                        Math.abs(record.error_mw) < 800 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {record.error_mw != null ? `${record.error_mw > 0 ? '+' : ''}${formatNumber(record.error_mw)}` : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs text-gray-400">
                        {record.error_pct != null ? formatPercent(record.error_pct) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
