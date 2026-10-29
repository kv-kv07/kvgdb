import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart,
  Line,
  Area,
  Cell,
  ReferenceLine,
} from 'recharts';
import { TrendingDown, TrendingUp, Target, Activity, BarChart3, Gauge } from 'lucide-react';
import MetricCard from './MetricCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { useAccuracy } from '../hooks/useWindData';
import { formatMW, formatNumber, formatPercent } from '../utils/formatters';

interface AccuracyDashboardProps {
  dateFrom: string;
  dateTo: string;
}

export default function AccuracyDashboard({ dateFrom, dateTo }: AccuracyDashboardProps) {
  const { data, isLoading, error, refetch } = useAccuracy(dateFrom, dateTo);

  if (isLoading) return <LoadingSpinner message="Calculating high-precision error distributions and diurnal metrics..." />;
  if (error) return <ErrorMessage message={error.message} onRetry={() => refetch()} />;
  if (!data) return null;

  const isOverForecasting = data.overall.mbe > 0;

  return (
    <div className="space-y-6">
      {/* 6-Card Executive Metrics Deck */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricCard
          title="MAE"
          value={formatMW(data.overall.mae)}
          subtitle="Mean Absolute Error"
          icon={<Target className="w-4 h-4" />}
          riskStatus="normal"
        />
        <MetricCard
          title="RMSE"
          value={formatMW(data.overall.rmse)}
          subtitle="Root Mean Square Error"
          icon={<Activity className="w-4 h-4" />}
          riskStatus="normal"
        />
        <MetricCard
          title="MAPE"
          value={formatPercent(data.overall.mape)}
          subtitle="Mean Abs % Deviation"
          icon={<BarChart3 className="w-4 h-4" />}
          riskStatus={data.overall.mape > 20 ? 'caution' : 'optimal'}
        />
        <MetricCard
          title="Bias (MBE)"
          value={`${isOverForecasting ? '+' : ''}${formatMW(data.overall.mbe)}`}
          subtitle={isOverForecasting ? 'Net Over-Forecasting' : 'Net Under-Forecasting'}
          icon={isOverForecasting ? <TrendingUp className="w-4 h-4 text-amber-400" /> : <TrendingDown className="w-4 h-4 text-sky-400" />}
          riskStatus={Math.abs(data.overall.mbe) > 2500 ? 'caution' : 'normal'}
        />
        <MetricCard
          title="Correlation"
          value={data.overall.correlation.toFixed(3)}
          subtitle="Pearson Coefficient"
          icon={<Gauge className="w-4 h-4" />}
          riskStatus={data.overall.correlation > 0.90 ? 'optimal' : 'normal'}
        />
        <MetricCard
          title="Sample Size"
          value={formatNumber(data.overall.n_observations)}
          subtitle="Half-hour intervals"
          riskStatus="normal"
        />
      </div>

      {/* Analytics Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Distribution Histogram */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Error Distribution Histogram (F − A)
            </h3>
            <span className="badge-neutral">
              25 Bins · Symmetric
            </span>
          </div>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={data.error_distribution} margin={{ top: 5, right: 15, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
              <XAxis
                dataKey="bin_start"
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                stroke="#334155"
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              />
              <YAxis 
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
                  color: '#e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                }}
                labelFormatter={(v) => `Error Horizon: ${formatMW(Number(v))}`}
                formatter={(v: number) => [`${v} intervals`, 'Count']}
              />
              <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
              <Bar dataKey="count" name="Frequency" radius={[2, 2, 0, 0]}>
                {data.error_distribution.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.bin_start >= 0 ? '#f59e0b' : '#38bdf8'}
                    fillOpacity={0.65}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-3 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-400/70" /> Negative: Deficit Under-forecast
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/70" /> Positive: Surplus Over-forecast
            </span>
          </div>
        </div>

        {/* Diurnal Hourly Accuracy Pattern */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Diurnal Accuracy Profile (Hour 00:00 to 23:00)
            </h3>
            <span className="badge-neutral">
              24-Hour Solar/Wind Cycle
            </span>
          </div>
          <ResponsiveContainer width="100%" height={290}>
            <ComposedChart data={data.hourly} margin={{ top: 5, right: 15, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
              <XAxis
                dataKey="hour"
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                stroke="#334155"
                tickLine={false}
                tickFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
              />
              <YAxis 
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
                labelFormatter={(h) => `Settlement Hour: ${String(h).padStart(2, '0')}:00 UTC`}
                formatter={(v: number, name: string) => [formatMW(v), name]}
              />
              <ReferenceLine y={0} stroke="#334155" />
              <Bar dataKey="mae" name="Mean Absolute Error" fill="#0F7A3E" fillOpacity={0.5} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="mbe" name="Systemic Bias (MBE)" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 2.5 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-3 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0F7A3E]/60" /> Green Bars: MAE Magnitude
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-400" /> Amber Curve: Bias Shift Direction
            </span>
          </div>
        </div>
      </div>

      {/* Daily Accuracy Longitudinal Trend */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Daily Longitudinal Forecast Accuracy Tracking · January 2026
          </h3>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-2.5 h-0.5 bg-sky-400" /> Daily Mean Actual
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-0.5 bg-emerald-400" /> Daily Mean Forecast
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-0.5 bg-amber-400" /> Daily MAPE (%)
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={data.daily} margin={{ top: 5, right: 15, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="dailyActualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              stroke="#334155"
              tickLine={false}
              tickFormatter={(d) => d.slice(5)}
            />
            <YAxis
              yAxisId="mw"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              stroke="#334155"
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              stroke="#334155"
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                border: '1px solid rgba(51, 65, 85, 0.8)', 
                borderRadius: '10px', 
                fontSize: '12px',
                color: '#e2e8f0'
              }}
            />
            <Area
              yAxisId="mw"
              type="monotone"
              dataKey="mean_actual"
              name="Mean Actual (MW)"
              stroke="#38bdf8"
              fill="url(#dailyActualGrad)"
              strokeWidth={1.5}
            />
            <Line
              yAxisId="mw"
              type="monotone"
              dataKey="mean_forecast"
              name="Mean Forecast (MW)"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ fill: '#10b981', r: 2 }}
            />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="mape"
              name="Daily MAPE (%)"
              stroke="#f59e0b"
              strokeWidth={1.75}
              dot={{ fill: '#f59e0b', r: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
