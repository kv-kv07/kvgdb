import React, { useMemo } from 'react';
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
  ScatterChart,
  Scatter,
  Cell,
  ReferenceLine,
} from 'recharts';
import { TrendingDown, TrendingUp, Target, Activity, BarChart3, Gauge } from 'lucide-react';
import MetricCard from './MetricCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { useAccuracy } from '../hooks/useWindData';
import { formatMW, formatNumber, formatPercent } from '../utils/formatters';
import type { AccuracyResponse } from '../types';

interface AccuracyDashboardProps {
  dateFrom: string;
  dateTo: string;
}

export default function AccuracyDashboard({ dateFrom, dateTo }: AccuracyDashboardProps) {
  const { data, isLoading, error, refetch } = useAccuracy(dateFrom, dateTo);

  if (isLoading) return <LoadingSpinner message="Computing accuracy metrics..." />;
  if (error) return <ErrorMessage message={error.message} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Overall Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="MAE"
          value={formatMW(data.overall.mae)}
          subtitle="Mean Absolute Error"
          icon={<Target className="w-4 h-4" />}
          trend={data.overall.mae < 500 ? 'good' : data.overall.mae < 1000 ? 'warning' : 'bad'}
        />
        <MetricCard
          title="RMSE"
          value={formatMW(data.overall.rmse)}
          subtitle="Root Mean Square Error"
          icon={<Activity className="w-4 h-4" />}
          trend={data.overall.rmse < 700 ? 'good' : data.overall.rmse < 1400 ? 'warning' : 'bad'}
        />
        <MetricCard
          title="MAPE"
          value={formatPercent(data.overall.mape)}
          subtitle="Mean Abs % Error"
          icon={<BarChart3 className="w-4 h-4" />}
          trend={data.overall.mape < 10 ? 'good' : data.overall.mape < 20 ? 'warning' : 'bad'}
        />
        <MetricCard
          title="Bias (MBE)"
          value={`${data.overall.mbe > 0 ? '+' : ''}${formatMW(data.overall.mbe)}`}
          subtitle={data.overall.mbe > 0 ? 'Over-forecasting' : 'Under-forecasting'}
          icon={data.overall.mbe > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          trend={Math.abs(data.overall.mbe) < 200 ? 'good' : Math.abs(data.overall.mbe) < 500 ? 'warning' : 'bad'}
        />
        <MetricCard
          title="Correlation"
          value={data.overall.correlation.toFixed(3)}
          subtitle="Pearson R"
          icon={<Gauge className="w-4 h-4" />}
          trend={data.overall.correlation > 0.95 ? 'good' : data.overall.correlation > 0.85 ? 'warning' : 'bad'}
        />
        <MetricCard
          title="Observations"
          value={formatNumber(data.overall.n_observations)}
          subtitle="Matched periods"
          trend="neutral"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Distribution */}
        <div className="card">
          <h3 className="card-header">Error Distribution (Forecast − Actual)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.error_distribution} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="bin_start"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                labelFormatter={(v) => `Error: ${formatMW(v)}`}
                formatter={(v: number) => [`${v} periods`, 'Count']}
              />
              <ReferenceLine x={0} stroke="#ef4444" strokeDasharray="3 3" />
              <Bar dataKey="count" name="Frequency" radius={[2, 2, 0, 0]}>
                {data.error_distribution.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.bin_start >= 0 ? '#f59e0b' : '#06b6d4'}
                    fillOpacity={0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Positive = Over-forecast · Negative = Under-forecast
          </p>
        </div>

        {/* Hourly Accuracy Pattern */}
        <div className="card">
          <h3 className="card-header">Accuracy by Hour of Day</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.hourly} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="hour"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
                formatter={(v: number, name: string) => [formatMW(v), name]}
              />
              <Bar dataKey="mae" name="MAE" fill="#3391ff" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="mbe" name="Bias (MBE)" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
              <ReferenceLine y={0} stroke="#374151" />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Blue bars: MAE · Red line: Bias direction
          </p>
        </div>
      </div>

      {/* Daily Accuracy Trend */}
      <div className="card">
        <h3 className="card-header">Daily Forecast Accuracy Trend</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data.daily} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={(d) => d.slice(5)} // MM-DD
            />
            <YAxis
              yAxisId="mw"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
            />
            <Area
              yAxisId="mw"
              type="monotone"
              dataKey="mean_actual"
              name="Mean Actual (MW)"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.1}
              strokeWidth={1.5}
            />
            <Line
              yAxisId="mw"
              type="monotone"
              dataKey="mean_forecast"
              name="Mean Forecast (MW)"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ fill: '#f59e0b', r: 2 }}
            />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="mape"
              name="MAPE (%)"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
