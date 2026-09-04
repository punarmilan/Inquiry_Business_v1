import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { BadgeCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsersList } from '@/hooks/useUsers';
import type { User } from '@/types';

const VERIFICATION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'true', label: 'Verified' },
  { value: 'false', label: 'Unverified' },
];

const REVIEW_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'not_started', label: 'Not Started' },
];

export const UsersPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isVerified, setIsVerified] = useState('all');
  const [kycStatus, setKycStatus] = useState('all');
  const [walletStatus, setWalletStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useUsersList({
    search: search || undefined,
    isVerified: isVerified === 'all' ? undefined : isVerified === 'true',
    kycStatus: kycStatus === 'all' ? undefined : kycStatus,
    walletStatus: walletStatus === 'all' ? undefined : walletStatus,
    page,
    limit: 20,
  });

  const columns: ColumnDef<User>[] = [
    { id: 'name', header: 'Name', cell: ({ row }) => row.original.name || '—' },
    { accessorKey: 'phone', header: 'Phone' },
    {
      id: 'verified',
      header: 'Verification',
      cell: ({ row }) =>
        row.original.aadhaarVerification.isVerified ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
            <BadgeCheck className="h-4 w-4" /> Aadhaar Verified
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Not verified</span>
        ),
    },
    {
      id: 'rating',
      header: 'Rating',
      cell: ({ row }) => `${row.original.ratingAverage.toFixed(1)} ★ (${row.original.ratingCount})`,
    },
    {
      id: 'kyc',
      header: 'KYC',
      cell: ({ row }) => <StatusBadge status={row.original.kyc?.status ?? 'not_started'} />,
    },
    {
      id: 'wallet',
      header: 'Wallet',
      cell: ({ row }) => <StatusBadge status={row.original.wallet?.status ?? 'not_started'} />,
    },
    { id: 'jobsCompleted', header: 'Jobs Completed', cell: ({ row }) => row.original.jobsCompletedCount },
    {
      id: 'joined',
      header: 'Joined',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.isBlocked ? 'blocked' : 'active'} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => navigate(`/users/${row.original._id}`)}>
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="User Management" description="Search, filter, and manage platform users." />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <Select
          value={isVerified}
          onValueChange={(v) => {
            setIsVerified(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Verification" />
          </SelectTrigger>
          <SelectContent>
            {VERIFICATION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={kycStatus}
          onValueChange={(v) => {
            setKycStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="KYC" />
          </SelectTrigger>
          <SelectContent>
            {REVIEW_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                KYC: {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={walletStatus}
          onValueChange={(v) => {
            setWalletStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Wallet" />
          </SelectTrigger>
          <SelectContent>
            {REVIEW_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                Wallet: {opt.label}
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
      />
    </div>
  );
};
