import React from 'react';
import { Wind, TrendingUp, Zap, BarChart3 } from 'lucide-react';
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
    return <LoadingSpinner message="Fetching wind generation data from Elexon BMRS..." />;
  }

  if (comparison.error) {
    return <ErrorMessage message={comparison.error.message} onRetry={() => comparison.refetch()} />;
  }

  if (!comparison.data) return null;

  const metrics = accuracy.data?.overall;

  return (
    <div className="space-y-6">
      {/* Hero Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Data Points"
          value={formatNumber(comparison.data.data.length)}
          subtitle="Half-hourly readings"
          icon={<BarChart3 className="w-4 h-4" />}
          trend="neutral"
        />
        {metrics && (
          <>
            <MetricCard
              title="Forecast MAE"
              value={formatMW(metrics.mae)}
              subtitle="Avg error magnitude"
              icon={<Wind className="w-4 h-4" />}
              trend={metrics.mae < 500 ? 'good' : metrics.mae < 1000 ? 'warning' : 'bad'}
            />
            <MetricCard
              title="Correlation"
              value={metrics.correlation.toFixed(3)}
              subtitle="Forecast tracks actuals"
              icon={<TrendingUp className="w-4 h-4" />}
              trend={metrics.correlation > 0.95 ? 'good' : metrics.correlation > 0.85 ? 'warning' : 'bad'}
            />
            <MetricCard
              title="MAPE"
              value={formatPercent(metrics.mape)}
              subtitle="Relative forecast error"
              icon={<Zap className="w-4 h-4" />}
              trend={metrics.mape < 10 ? 'good' : metrics.mape < 20 ? 'warning' : 'bad'}
            />
          </>
        )}
      </div>

      {/* Main Chart */}
      <ForecastChart
        data={comparison.data.data}
        title="UK National Wind Generation — January 2026"
        showError={true}
        height={450}
      />

      {/* Info Banner */}
      <div className="bg-brand-950/30 border border-brand-800/30 rounded-xl p-4 flex items-start gap-3">
        <Wind className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-gray-300">
          <p className="font-medium text-brand-300 mb-1">About This Data</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Wind generation actuals from the FUELHH dataset and day-ahead forecasts from the WINDFOR dataset, 
            sourced from Elexon BMRS. Forecasts shown are the latest available before day-ahead gate closure 
            (~11:00 UTC D-1). All values represent UK national-level wind power in megawatts (MW).
          </p>
        </div>
      </div>
    </div>
  );
}
