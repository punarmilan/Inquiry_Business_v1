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
  const [targetType, setTargetType] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, refetch } = useReportsList({
    status: status === 'all' ? undefined : status,
    targetType: targetType === 'all' ? undefined : targetType,
    page,
    limit: 20,
  });
  const approveReport = useApproveReport();
  const rejectReport = useRejectReport();

  const columns: ColumnDef<Report>[] = [
    { id: 'type', header: 'Type', cell: ({ row }) => <span className="capitalize">{row.original.targetType}</span> },
    {
      id: 'target',
      header: 'Reported item',
      cell: ({ row }) => {
        const report = row.original;
        const label = report.target?.title || report.target?.name || report.target?.bookingNumber || report.target?.phone;
        return (
          <div>
            <p className="font-medium">{label || 'Removed item'}</p>
            <p className="text-xs text-muted-foreground">{report.target?.status || report.target?.verificationStatus || report.targetId}</p>
          </div>
        );
      },
    },
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
        if (!reporter) return 'Removed user';
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
              disabled={approveReport.isPending || rejectReport.isPending}
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
              disabled={approveReport.isPending || rejectReport.isPending}
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
      <PageHeader title="Reported Content Queue" description="Review content reported by app users." />

      <div className="mb-4 flex gap-3">
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
        <Select value={targetType} onValueChange={(value) => { setTargetType(value); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Content type" /></SelectTrigger>
          <SelectContent>
            {['all', 'job', 'user', 'business', 'offer', 'service_booking'].map((type) => <SelectItem key={type} value={type} className="capitalize">{type.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {!isLoading && !isError && <p className="mb-3 text-sm text-muted-foreground">{data?.pagination.total ?? 0} report(s)</p>}

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageCount={Math.max(data?.pagination.pages ?? 1, 1)}
        onPageChange={setPage}
        emptyMessage="No reports in this filter."
      />
      {isError && <div className="mt-3 flex items-center gap-3"><p className="text-sm text-destructive">Reports could not be loaded.</p><Button size="sm" variant="outline" onClick={() => void refetch()}>Retry</Button></div>}
    </div>
  );
};
