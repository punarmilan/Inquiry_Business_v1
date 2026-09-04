import client from './client';
import type { DashboardStats, RevenueSeriesPoint } from '@/types';

export const fetchStats = async () => {
  const { data } = await client.get<{ success: true; stats: DashboardStats }>('/dashboard/stats');
  return data.stats;
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
