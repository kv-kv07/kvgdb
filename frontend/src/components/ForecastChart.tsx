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
import { formatTime, formatMW, formatDateTime } from '../utils/formatters';
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
  height = 400,
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

  // Sample data for large datasets (show every Nth point)
  const sampledData = useMemo(() => {
    if (chartData.length <= 200) return chartData;
    const step = Math.ceil(chartData.length / 200);
    return chartData.filter((_, i) => i % step === 0);
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl text-xs">
        <p className="text-gray-400 mb-2 font-medium">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-300">{entry.name}:</span>
            <span className="text-white font-mono font-medium">
              {formatMW(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="card">
      <h3 className="card-header">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={sampledData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            interval="preserveStartEnd"
            tickCount={8}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          />
          <Area
            type="monotone"
            dataKey="actual"
            name="Actual Generation"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={0.1}
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            connectNulls
          />
          {showError && (
            <>
              <ReferenceLine y={0} stroke="#374151" />
              <Line
                type="monotone"
                dataKey="error"
                name="Error (F−A)"
                stroke="#ef4444"
                strokeWidth={1}
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
