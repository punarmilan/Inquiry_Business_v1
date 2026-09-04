import client from './client';
import type { Paginated, Report } from '@/types';

export interface ReportFilters {
  status?: string;
  targetType?: string;
  page?: number;
  limit?: number;
}

export const fetchReports = async (filters: ReportFilters) => {
  const { data } = await client.get<{ success: true } & Paginated<Report>>('/reports', { params: filters });
  return data;
};

export const approveReport = async (id: string) => {
  const { data } = await client.put<{ success: true; report: Report }>(`/reports/${id}/approve`);
  return data.report;
};

export const rejectReport = async (id: string) => {
  const { data } = await client.put<{ success: true; report: Report }>(`/reports/${id}/reject`);
  return data.report;
};
