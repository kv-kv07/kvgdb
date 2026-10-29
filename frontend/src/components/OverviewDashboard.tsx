import React from 'react';
import { Wind, TrendingUp, Zap, BarChart3, Database } from 'lucide-react';
import ForecastChart from './ForecastChart';
import MetricCard from './MetricCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { useComparison, useAccuracy } from '../hooks/useWindData';
import { formatMW, formatPercent, formatNumber } from '../utils/formatters';

interface OverviewDashboardProps {
  dateFrom: string;
  dateTo: string;
}

export default function OverviewDashboard({ dateFrom, dateTo }: OverviewDashboardProps) {
  const comparison = useComparison(dateFrom, dateTo);
  const accuracy = useAccuracy(dateFrom, dateTo);

  if (comparison.isLoading || accuracy.isLoading) {
    return <LoadingSpinner message="Streaming January 2026 outturn & forecast series from Elexon BMRS..." />;
  }

  if (comparison.error) {
    return <ErrorMessage message={comparison.error.message} onRetry={() => comparison.refetch()} />;
  }

  if (!comparison.data) return null;

  const metrics = accuracy.data?.overall;

  return (
    <div className="space-y-6">
      {/* Executive KPI Deck */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Observations"
          value={formatNumber(comparison.data.data.length)}
          subtitle="Half-hourly intervals"
          icon={<Database className="w-4 h-4" />}
          riskStatus="normal"
        />
        {metrics && (
          <>
            <MetricCard
              title="Mean Abs Error (MAE)"
              value={formatMW(metrics.mae)}
              subtitle="Average deviation"
              icon={<Wind className="w-4 h-4" />}
              riskStatus={metrics.mae > 3500 ? 'caution' : 'optimal'}
            />
            <MetricCard
              title="Directional Correlation"
              value={metrics.correlation.toFixed(3)}
              subtitle="Pearson r index"
              icon={<TrendingUp className="w-4 h-4" />}
              riskStatus={metrics.correlation > 0.90 ? 'optimal' : 'normal'}
            />
            <MetricCard
              title="Relative Error (MAPE)"
              value={formatPercent(metrics.mape)}
              subtitle="Mean % deviation"
              icon={<Zap className="w-4 h-4" />}
              riskStatus={metrics.mape > 25 ? 'caution' : 'optimal'}
            />
          </>
        )}
      </div>

      {/* Main High-Performance Cockpit Chart */}
      <ForecastChart
        data={comparison.data.data}
        title="UK National Wind Outturn vs Day-Ahead Forecast · January 2026"
        showError={true}
        height={450}
      />

      {/* Wholesale Market Mechanics Information Panel */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm shadow-panel">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
          <Wind className="w-4 h-4" />
        </div>
        <div className="text-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-200">Wholesale Day-Ahead Market Mechanics</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Elexon Insights
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Data streams connect directly to Elexon BMRS <code className="text-slate-300 font-mono">FUELHH/stream</code> (metered wind generation) 
            and <code className="text-slate-300 font-mono">WINDFOR/stream</code> (National Grid ESO forecasted wind). 
            All forecasts reflect the latest vintage published prior to Day-Ahead gate closure (11:00 UTC D-1), enabling empirical procurement hedging.
          </p>
        </div>
      </div>
    </div>
  );
}
