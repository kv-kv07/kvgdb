/** A single time-series data point for generation. */
export interface GenerationDataPoint {
  timestamp: string;
  actual_mw: number | null;
  forecast_mw: number | null;
  error_mw: number | null;
}

/** Response for forecast vs actual comparison. */
export interface ComparisonResponse {
  date_from: string;
  date_to: string;
  data: GenerationDataPoint[];
  forecast_vintages: string[];
}

/** Quantitative forecast accuracy metrics. */
export interface AccuracyMetrics {
  mae: number;
  rmse: number;
  mape: number;
  mbe: number;
  max_error: number;
  correlation: number;
  n_observations: number;
}

/** Error distribution histogram bin. */
export interface ErrorDistributionBin {
  bin_start: number;
  bin_end: number;
  count: number;
  percentage: number;
}

/** Hourly accuracy breakdown. */
export interface HourlyAccuracy {
  hour: number;
  mae: number;
  mbe: number;
  rmse: number;
  n_observations: number;
}

/** Daily accuracy breakdown. */
export interface DailyAccuracy {
  date: string;
  mae: number;
  rmse: number;
  mape: number;
  mbe: number;
  mean_actual: number;
  mean_forecast: number;
  n_observations: number;
}

/** Full accuracy analysis response. */
export interface AccuracyResponse {
  overall: AccuracyMetrics;
  daily: DailyAccuracy[];
  hourly: HourlyAccuracy[];
  error_distribution: ErrorDistributionBin[];
}

/** Day-ahead decision record. */
export interface DayAheadRecord {
  delivery_time: string;
  latest_forecast_mw: number | null;
  forecast_publish_time: string | null;
  actual_mw: number | null;
  error_mw: number | null;
  error_pct: number | null;
}

/** Day-ahead view response. */
export interface DayAheadResponse {
  delivery_date: string;
  gate_closure: string;
  forecast_vintage: string;
  records: DayAheadRecord[];
  summary: AccuracyMetrics;
}

/** Navigation tab type. */
export type TabId = 'overview' | 'accuracy' | 'day-ahead';

export interface Tab {
  id: TabId;
  label: string;
  icon: string;
}
