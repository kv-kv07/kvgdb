import React from 'react';
import { clsx } from 'clsx';

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'good' | 'warning' | 'bad' | 'neutral';
  riskStatus?: 'normal' | 'caution' | 'alert' | 'optimal';
  className?: string;
}

export default function MetricCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  trend = 'neutral',
  riskStatus,
  className,
}: MetricCardProps) {
  // Determine effective status
  const effectiveStatus = riskStatus || (
    trend === 'bad' ? 'alert' :
    trend === 'warning' ? 'caution' :
    trend === 'good' ? 'optimal' : 'normal'
  );

  // Status badges: subtle, clean enterprise indicator pills
  const statusBadge = {
    normal: null,
    optimal: (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        In-Target
      </span>
    ),
    caution: (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
        Variance
      </span>
    ),
    alert: (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
        Risk Alert
      </span>
    ),
  };

  // Separate value and unit if unit not explicitly passed
  let displayValue = value;
  let displayUnit = unit;

  if (!displayUnit) {
    const match = value.match(/^([+-]?[\d,.]+)\s*(MW|GW|%|k)?$/i);
    if (match) {
      displayValue = match[1];
      displayUnit = match[2] || '';
    }
  }

  return (
    <div
      className={clsx(
        'bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 shadow-panel backdrop-blur-sm',
        'hover:border-slate-700/80 transition-all duration-150 flex flex-col justify-between',
        className,
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {statusBadge[effectiveStatus]}
          {icon && <span className="text-slate-500">{icon}</span>}
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="flex items-baseline gap-2 my-1">
        <span className="text-2xl font-bold font-mono tracking-tight text-slate-100">
          {displayValue}
        </span>
        {displayUnit && (
          <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
            {displayUnit}
          </span>
        )}
      </div>

      {/* Subtitle / Context Note */}
      {subtitle && (
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}
