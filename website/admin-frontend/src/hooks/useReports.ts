import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as reportsApi from '@/api/reports';
import type { ReportFilters } from '@/api/reports';

export const useReportsList = (filters: ReportFilters) =>
  useQuery({ queryKey: ['reports', filters], queryFn: () => reportsApi.fetchReports(filters) });

export const useApproveReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reportsApi.approveReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
};

export const useRejectReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reportsApi.rejectReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
};
