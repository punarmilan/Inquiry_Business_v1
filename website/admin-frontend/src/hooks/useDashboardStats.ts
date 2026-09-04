import { useQuery } from '@tanstack/react-query';
import { fetchStats, fetchRevenueSeries, type RevenueSeriesFilters } from '@/api/dashboard';

export const useDashboardStats = () =>
  useQuery({ queryKey: ['dashboard', 'stats'], queryFn: fetchStats });

export const useRevenueSeries = (filters: RevenueSeriesFilters) =>
  useQuery({
    queryKey: ['dashboard', 'revenue', filters],
    queryFn: () => fetchRevenueSeries(filters),
  });
