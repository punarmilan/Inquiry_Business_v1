import client from './client';
import type {
  CompareWindow,
  DashboardInsights,
  DashboardStats,
  DashboardStatsResponse,
  GlobalSearchResults,
  PerformancePoint,
  RevenueSeriesPoint,
} from '@/types';

export const fetchStats = async () => {
  const { data } = await client.get<{ success: true; stats: DashboardStats }>('/dashboard/stats');
  return data.stats;
};

export const fetchStatsWithTrends = async (compareDays: CompareWindow) => {
  const { data } = await client.get<{ success: true } & DashboardStatsResponse>('/dashboard/stats', { params: { compareDays } });
  return data;
};

export const fetchPerformance = async (range: CompareWindow) => {
  const { data } = await client.get<{ success: true; range: number; series: PerformancePoint[] }>('/dashboard/performance', { params: { range } });
  return data.series;
};

export const fetchInsights = async () => {
  const { data } = await client.get<{ success: true } & DashboardInsights>('/dashboard/insights');
  return data;
};

export const searchEverything = async (q: string) => {
  const { data } = await client.get<{ success: true; results: GlobalSearchResults }>('/dashboard/search', { params: { q } });
  return data.results;
};

export interface RevenueSeriesFilters {
  granularity: 'daily' | 'weekly' | 'monthly';
  dateFrom?: string;
  dateTo?: string;
}

export const fetchRevenueSeries = async (filters: RevenueSeriesFilters) => {
  const { data } = await client.get<{ success: true; series: RevenueSeriesPoint[] }>('/dashboard/revenue', {
    params: filters,
  });
  return data.series;
};
