import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatMW, formatDateTime } from '../utils/formatters';
import type { GenerationDataPoint } from '../types';

interface ForecastChartProps {
  data: GenerationDataPoint[];
  title?: string;
  showError?: boolean;
  height?: number;
}

interface ChartDataPoint {
  timestamp: string;
  time: string;
  actual: number | null;
  forecast: number | null;
  error: number | null;
}

export default function ForecastChart({
  data,
  title = 'Wind Generation: Forecast vs Actual',
  showError = false,
  height = 420,
}: ForecastChartProps) {
  const chartData = useMemo<ChartDataPoint[]>(() => {
    return data.map((d) => ({
      timestamp: d.timestamp,
      time: formatDateTime(d.timestamp),
      actual: d.actual_mw,
      forecast: d.forecast_mw,
      error: d.error_mw,
    }));
  }, [data]);

  // Sample data for large datasets (limit render nodes for 60fps performance)
  const sampledData = useMemo(() => {
    if (chartData.length <= 250) return chartData;
    const step = Math.ceil(chartData.length / 250);
    return chartData.filter((_, i) => i % step === 0);
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs">
        <p className="text-slate-400 mb-2 font-mono font-medium border-b border-slate-800 pb-1.5">
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-300">{entry.name}:</span>
              </div>
              <span className="text-slate-100 font-mono font-semibold">
                {formatMW(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {title}
        </h3>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-sky-400">
            <span className="w-2.5 h-0.5 bg-sky-400 rounded-full" /> Actual Outturn
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-0.5 bg-emerald-400 border-dashed border-b border-emerald-400" /> Platform Forecast
          </span>
          {showError && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-0.5 bg-amber-400" /> Imbalance Error
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={sampledData} margin={{ top: 10, right: 16, bottom: 5, left: 10 }}>
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
          
          <XAxis
            dataKey="time"
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
            stroke="#334155"
            tickLine={false}
            interval="preserveStartEnd"
            tickCount={8}
          />
          
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
            stroke="#334155"
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={48}
          />
          
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ display: 'none' }} />

          {/* Actual Generation Outturn: Clean solid sky blue with gradient fill */}
          <Area
            type="monotone"
            dataKey="actual"
            name="Actual Outturn (MW)"
            stroke="#38bdf8"
            fill="url(#actualGradient)"
            strokeWidth={1.75}
            dot={false}
            connectNulls
          />

          {/* Forecast: Distinct emerald forest green dashed curve */}
          <Line
            type="monotone"
            dataKey="forecast"
            name="Day-Ahead Forecast (MW)"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            connectNulls
          />

          {/* Error / Imbalance Curve: Muted amber */}
          {showError && (
            <>
              <ReferenceLine y={0} stroke="#334155" strokeDasharray="2 2" />
              <Line
                type="monotone"
                dataKey="error"
                name="Error Imbalance (MW)"
                stroke="#f59e0b"
                strokeWidth={1.25}
                strokeDasharray="2 2"
                dot={false}
                connectNulls
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
