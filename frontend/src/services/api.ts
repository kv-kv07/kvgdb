import axios from 'axios';
import type {
  ComparisonResponse,
  AccuracyResponse,
  DayAheadResponse,
} from '../types';

// API base URL - uses Vite proxy in dev, env var in production
const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60s timeout for large data requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred';
    console.error('[API Error]', message);
    return Promise.reject(new Error(message));
  }
);

/** Fetch forecast vs actual comparison data. */
export async function fetchComparison(
  dateFrom: string = '2026-01-01',
  dateTo: string = '2026-01-31',
): Promise<ComparisonResponse> {
  const { data } = await api.get<ComparisonResponse>('/api/wind/comparison', {
    params: { date_from: dateFrom, date_to: dateTo },
  });
  return data;
}

/** Fetch accuracy analysis. */
export async function fetchAccuracy(
  dateFrom: string = '2026-01-01',
  dateTo: string = '2026-01-31',
): Promise<AccuracyResponse> {
  const { data } = await api.get<AccuracyResponse>('/api/wind/accuracy', {
    params: { date_from: dateFrom, date_to: dateTo },
  });
  return data;
}

/** Fetch day-ahead view for a specific delivery date. */
export async function fetchDayAhead(
  deliveryDate: string,
): Promise<DayAheadResponse> {
  const { data } = await api.get<DayAheadResponse>(
    `/api/wind/day-ahead/${deliveryDate}`,
  );
  return data;
}

/** Health check. */
export async function fetchHealth(): Promise<{ status: string; version: string }> {
  const { data } = await api.get('/health');
  return data;
}
