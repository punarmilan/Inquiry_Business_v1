import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReportsList, useApproveReport, useRejectReport } from '@/hooks/useReports';
import type { Report } from '@/types';

const STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'all'];

export const ReportsQueuePage = () => {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useReportsList({
    status: status === 'all' ? undefined : status,
    page,
    limit: 20,
  });
  const approveReport = useApproveReport();
  const rejectReport = useRejectReport();

  const columns: ColumnDef<Report>[] = [
    { id: 'type', header: 'Type', cell: ({ row }) => <span className="capitalize">{row.original.targetType}</span> },
    { accessorKey: 'reason', header: 'Reason' },
    {
      id: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="block max-w-xs truncate text-muted-foreground" title={row.original.description}>
          {row.original.description || '—'}
        </span>
      ),
    },
    {
      id: 'reporter',
      header: 'Reported By',
      cell: ({ row }) => {
        const reporter = row.original.reporterId;
        return typeof reporter === 'object' ? reporter.name || reporter.phone : reporter;
      },
    },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: 'date',
      header: 'Reported',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'pending' ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                approveReport.mutate(row.original._id, {
                  onSuccess: () => toast.success('Report approved.'),
                  onError: () => toast.error('Failed to approve report.'),
                })
              }
            >
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                rejectReport.mutate(row.original._id, {
                  onSuccess: () => toast.success('Report rejected.'),
                  onError: () => toast.error('Failed to reject report.'),
                })
              }
            >
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="Reported Content Queue" description="Review flagged jobs and users." />

      <div className="mb-4">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageCount={data?.pagination.pages ?? 1}
        onPageChange={setPage}
        emptyMessage="No reports in this filter."
      />
    </div>
  );
};
