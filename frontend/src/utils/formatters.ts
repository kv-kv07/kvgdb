import { format, parseISO } from 'date-fns';

/** Format MW value with appropriate suffix. */
export function formatMW(value: number | null | undefined): string {
  if (value == null) return '—';
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)} GW`;
  }
  return `${value.toFixed(0)} MW`;
}

/** Format a number with commas. */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null) return '—';
  return value.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format percentage. */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—';
  return `${value.toFixed(decimals)}%`;
}

/** Format ISO timestamp to readable time. */
export function formatTime(isoString: string): string {
  try {
    return format(parseISO(isoString), 'HH:mm');
  } catch {
    return isoString;
  }
}

/** Format ISO timestamp to readable date. */
export function formatDate(isoString: string): string {
  try {
    return format(parseISO(isoString), 'dd MMM yyyy');
  } catch {
    return isoString;
  }
}

/** Format ISO timestamp to short date-time. */
export function formatDateTime(isoString: string): string {
  try {
    return format(parseISO(isoString), 'dd MMM HH:mm');
  } catch {
    return isoString;
  }
}

/** Get color based on error magnitude. */
export function getErrorColor(error: number | null, threshold = 500): string {
  if (error == null) return 'text-gray-500';
  const absError = Math.abs(error);
  if (absError < threshold * 0.3) return 'text-emerald-400';
  if (absError < threshold * 0.7) return 'text-amber-400';
  return 'text-red-400';
}

/** Determine if a metric is "good" or "bad" for color coding. */
export function getMetricColor(metric: string, value: number): string {
  const thresholds: Record<string, [number, number]> = {
    mape: [5, 15],
    correlation: [0.95, 0.85], // Reversed: higher is better
  };
  
  const [good, bad] = thresholds[metric] || [0, 0];
  if (metric === 'correlation') {
    if (value >= good) return 'text-emerald-400';
    if (value >= bad) return 'text-amber-400';
    return 'text-red-400';
  }
  if (value <= good) return 'text-emerald-400';
  if (value <= bad) return 'text-amber-400';
  return 'text-red-400';
}
