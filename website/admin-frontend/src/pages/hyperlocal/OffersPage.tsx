import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOffersList, useModerateOffer } from '@/hooks/useHyperlocal';
import type { OfferRecord } from '@/api/hyperlocal';

const STATUS_TABS = ['pending_review', 'approved', 'rejected', 'live', 'expired', 'suspended', 'featured'];

export const OffersPage = () => {
  const [status, setStatus] = useState('pending_review');
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{ offer: OfferRecord; action: 'approve' | 'suspend' | 'restore' | 'feature' | 'unfeature' } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OfferRecord | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useOffersList({ status, page, limit: 20 });
  const moderateOffer = useModerateOffer();

  const runAction = (offer: OfferRecord, action: string, extra: Record<string, unknown> = {}) => {
    moderateOffer.mutate(
      { id: offer._id, payload: { action, ...extra } },
      {
        onSuccess: () => {
          toast.success('Offer updated.');
          setConfirmAction(null);
          setRejectTarget(null);
          setReason('');
        },
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to update offer.'),
      }
    );
  };

  const columns: ColumnDef<OfferRecord>[] = [
    { accessorKey: 'title', header: 'Offer' },
    {
      id: 'business',
      header: 'Business',
      cell: ({ row }) => row.original.business?.name ?? '—',
    },
    {
      id: 'city',
      header: 'City',
      cell: ({ row }) => row.original.city?.name ?? '—',
    },
    {
      id: 'price',
      header: 'Price',
      cell: ({ row }) => `₹${row.original.originalPrice} → ₹${row.original.offerPrice}`,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.original.status} />
          {row.original.isFeatured && <StatusBadge status="featured" />}
        </div>
      ),
    },
    {
      id: 'expiresAt',
      header: 'Expires',
      cell: ({ row }) => new Date(row.original.expiresAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const offer = row.original;
        return (
          <div className="flex flex-wrap justify-end gap-2">
            {offer.status === 'pending_review' && (
              <>
                <Button size="sm" onClick={() => setConfirmAction({ offer, action: 'approve' })}>
                  Publish
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setRejectTarget(offer)}>
                  Reject
                </Button>
              </>
            )}
            {offer.status === 'approved' && (
              <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ offer, action: 'suspend' })}>
                Remove
              </Button>
            )}
            {offer.status === 'suspended' && (
              <Button size="sm" variant="outline" onClick={() => setConfirmAction({ offer, action: 'restore' })}>
                Restore
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmAction({ offer, action: offer.isFeatured ? 'unfeature' : 'feature' })}
            >
              {offer.isFeatured ? 'Unfeature' : 'Feature 7 days'}
            </Button>
          </div>
        );
      },
    },
  ];

  const confirmCopy: Record<string, { title: string; description: string; destructive?: boolean }> = {
    approve: { title: 'Approve this offer?', description: 'It will become visible to nearby customers when its selected start date arrives.' },
    suspend: { title: 'Remove this offer?', description: 'It will no longer appear in customer discovery. You can restore it later.', destructive: true },
    restore: { title: 'Restore this offer?', description: 'It will become visible to nearby customers again if it is within its active dates and 10 KM range.' },
    feature: { title: 'Feature this offer for 7 days?', description: 'It will be ranked higher among eligible nearby offers, without bypassing the 10 KM radius.' },
    unfeature: { title: 'Remove featured placement?', description: 'The offer stays live but loses priority ranking.' },
  };

  return (
    <div>
      <PageHeader title="Offers" description="Review offer posts before they appear to nearby customers." />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? 'default' : 'outline'}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className="capitalize"
          >
            {s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageCount={data?.pagination.pages ?? 1}
        onPageChange={setPage}
        emptyMessage="No offers in this status."
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction ? confirmCopy[confirmAction.action].title : ''}
        description={confirmAction ? confirmCopy[confirmAction.action].description : ''}
        destructive={confirmAction ? confirmCopy[confirmAction.action].destructive : false}
        confirmLabel="Confirm"
        loading={moderateOffer.isPending}
        onConfirm={() => {
          if (!confirmAction) return;
          const extra =
            confirmAction.action === 'feature'
              ? { featuredUntil: new Date(Date.now() + 7 * 86400000).toISOString(), priorityRank: 10 }
              : {};
          runAction(confirmAction.offer, confirmAction.action, extra);
        }}
      />

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this offer?</DialogTitle>
            <DialogDescription>
              The business will see this reason and can resubmit after fixing it.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Reason for rejection"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || moderateOffer.isPending}
              onClick={() => rejectTarget && runAction(rejectTarget, 'reject', { reason: reason.trim() })}
            >
              {moderateOffer.isPending ? 'Please wait…' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
