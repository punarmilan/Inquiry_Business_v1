import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import { usePaymentsList, useVerifyPayment, useRefundPayment } from '@/hooks/useHyperlocal';
import type { PaymentRecord } from '@/api/hyperlocal';

const STATUS_TABS = ['pending_verification', 'verified', 'refunded', 'failed'];

export const CommercePaymentsPage = () => {
  const [status, setStatus] = useState('pending_verification');
  const [page, setPage] = useState(1);
  const [verifyTarget, setVerifyTarget] = useState<PaymentRecord | null>(null);
  const [refundTarget, setRefundTarget] = useState<PaymentRecord | null>(null);
  const [providerPaymentId, setProviderPaymentId] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const { data, isLoading } = usePaymentsList({ status, page, limit: 20 });
  const verifyPayment = useVerifyPayment();
  const refundPayment = useRefundPayment();

  const closeVerify = () => {
    setVerifyTarget(null);
    setProviderPaymentId('');
  };
  const closeRefund = () => {
    setRefundTarget(null);
    setRefundReason('');
  };

  const columns: ColumnDef<PaymentRecord>[] = [
    {
      id: 'order',
      header: 'Order',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.orderId}</p>
          <p className="text-xs text-muted-foreground">₹{row.original.amount}</p>
        </div>
      ),
    },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => <span className="capitalize">{row.original.type}</span> },
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => row.original.user?.name || row.original.user?.phone || '—',
    },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div className="flex justify-end gap-2">
            {payment.status === 'pending_verification' && (
              <Button size="sm" onClick={() => setVerifyTarget(payment)}>
                Verify
              </Button>
            )}
            {payment.status === 'verified' && (
              <Button size="sm" variant="destructive" onClick={() => setRefundTarget(payment)}>
                Refund
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Subscription, service, promotion and refund payments. Client-reported success can never activate anything — verification here is the only path."
      />

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
        emptyMessage="No payments in this status."
      />

      <Dialog open={!!verifyTarget} onOpenChange={(open) => !open && closeVerify()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify payment {verifyTarget?.orderId}?</DialogTitle>
            <DialogDescription>
              Confirm you have checked the payment with the provider/bank statement. This activates the
              subscription or marks the booking paid — it cannot be undone from the client side.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Provider / bank payment reference"
            value={providerPaymentId}
            onChange={(e) => setProviderPaymentId(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeVerify}>
              Cancel
            </Button>
            <Button
              disabled={!providerPaymentId.trim() || verifyPayment.isPending}
              onClick={() =>
                verifyTarget &&
                verifyPayment.mutate(
                  { id: verifyTarget._id, providerPaymentId: providerPaymentId.trim() },
                  {
                    onSuccess: () => {
                      toast.success('Payment verified.');
                      closeVerify();
                    },
                    onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Verification failed.'),
                  }
                )
              }
            >
              {verifyPayment.isPending ? 'Please wait…' : 'Verify payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!refundTarget} onOpenChange={(open) => !open && closeRefund()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund payment {refundTarget?.orderId}?</DialogTitle>
            <DialogDescription>
              This marks the payment refunded and cancels its active subscription, if any.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Refund reason"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeRefund}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!refundReason.trim() || refundPayment.isPending}
              onClick={() =>
                refundTarget &&
                refundPayment.mutate(
                  { id: refundTarget._id, reason: refundReason.trim() },
                  {
                    onSuccess: () => {
                      toast.success('Payment refunded.');
                      closeRefund();
                    },
                    onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Refund failed.'),
                  }
                )
              }
            >
              {refundPayment.isPending ? 'Please wait…' : 'Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
