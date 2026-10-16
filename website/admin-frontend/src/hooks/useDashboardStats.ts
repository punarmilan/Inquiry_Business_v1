import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchInsights,
  fetchPerformance,
  fetchRevenueSeries,
  fetchStats,
  fetchStatsWithTrends,
  searchEverything,
  type RevenueSeriesFilters,
} from '@/api/dashboard';
import type { CompareWindow } from '@/types';

export const useDashboardStats = () =>
  useQuery({ queryKey: ['dashboard', 'stats'], queryFn: fetchStats });

export const useDashboardTrends = (compareDays: CompareWindow) =>
  useQuery({ queryKey: ['dashboard', 'stats', compareDays], queryFn: () => fetchStatsWithTrends(compareDays), placeholderData: keepPreviousData });

export const usePerformance = (range: CompareWindow) =>
  useQuery({ queryKey: ['dashboard', 'performance', range], queryFn: () => fetchPerformance(range), placeholderData: keepPreviousData });

export const useDashboardInsights = () =>
  useQuery({ queryKey: ['dashboard', 'insights'], queryFn: fetchInsights });

export const useGlobalSearch = (q: string) =>
  useQuery({ queryKey: ['dashboard', 'search', q], queryFn: () => searchEverything(q), enabled: q.length >= 2, staleTime: 15_000 });

export const useRevenueSeries = (filters: RevenueSeriesFilters, enabled = true) =>
  useQuery({
    queryKey: ['dashboard', 'revenue', filters],
    queryFn: () => fetchRevenueSeries(filters),
    enabled,
  });
