import { useQuery } from '@tanstack/react-query';
import { fetchComparison, fetchAccuracy, fetchDayAhead } from '../services/api';

/** Hook for forecast vs actual comparison data. */
export function useComparison(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['comparison', dateFrom, dateTo],
    queryFn: () => fetchComparison(dateFrom, dateTo),
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

/** Hook for accuracy analysis. */
export function useAccuracy(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['accuracy', dateFrom, dateTo],
    queryFn: () => fetchAccuracy(dateFrom, dateTo),
    staleTime: 10 * 60 * 1000,
  });
}

/** Hook for day-ahead view. */
export function useDayAhead(deliveryDate: string) {
  return useQuery({
    queryKey: ['day-ahead', deliveryDate],
    queryFn: () => fetchDayAhead(deliveryDate),
    enabled: !!deliveryDate,
    staleTime: 10 * 60 * 1000,
  });
}
