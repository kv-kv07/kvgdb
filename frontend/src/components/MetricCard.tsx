import React from 'react';
import { clsx } from 'clsx';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'good' | 'warning' | 'bad' | 'neutral';
  className?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend = 'neutral',
  className,
}: MetricCardProps) {
  const trendColors = {
    good: 'border-emerald-500/30 bg-emerald-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    bad: 'border-red-500/30 bg-red-500/5',
    neutral: 'border-gray-800 bg-gray-900',
  };

  const valueColors = {
    good: 'text-emerald-400',
    warning: 'text-amber-400',
    bad: 'text-red-400',
    neutral: 'text-white',
  };

  return (
    <div
      className={clsx(
        'rounded-xl border p-5 transition-all duration-200 hover:shadow-lg',
        trendColors[trend],
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {title}
        </span>
        {icon && <span className="text-gray-600">{icon}</span>}
      </div>
      <p className={clsx('text-2xl font-bold font-mono', valueColors[trend])}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}
