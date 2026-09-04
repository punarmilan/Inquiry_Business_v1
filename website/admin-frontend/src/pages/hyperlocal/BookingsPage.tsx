import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWorkersList, useBookingsList, useForwardBooking, useUpdateBookingStatus } from '@/hooks/useHyperlocal';
import type { BookingRecord } from '@/api/hyperlocal';

const STATUSES = ['requested', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'];

export const BookingsPage = () => {
  const [status, setStatus] = useState('requested');
  const [selectedWorkers, setSelectedWorkers] = useState<Record<string, string[]>>({});
  const [completeTarget, setCompleteTarget] = useState<BookingRecord | null>(null);
  const [finalPrice, setFinalPrice] = useState('');

  const { data, isLoading } = useBookingsList({ status, limit: 100 });
  const { data: workers } = useWorkersList({ limit: 100 });
  const forwardBooking = useForwardBooking();
  const updateStatus = useUpdateBookingStatus();

  const advance = (booking: BookingRecord, next: string) =>
    updateStatus.mutate(
      { id: booking._id, status: next },
      {
        onSuccess: () => toast.success('Booking updated.'),
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to update booking.'),
      }
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Service Bookings" description="Confirm, assign matching workers and manage the service lifecycle." />

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button key={s} size="sm" variant={s === status ? 'default' : 'outline'} onClick={() => setStatus(s)} className="capitalize">
            {s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading bookings…</p>
      ) : (
        <div className="space-y-3">
          {data?.data.map((b) => {
            const matchingWorkers = workers?.data.filter(
              (w) =>
                w.city?._id === b.city?._id &&
                w.categories?.some((c) => c._id === b.category?._id) &&
                w.isActive &&
                w.verificationStatus === 'verified' &&
                (!b.locality || (w.serviceAreas || []).some((area) => area.trim().replace(/\s+/g, ' ').toLowerCase() === b.locality?.trim().replace(/\s+/g, ' ').toLowerCase()))
            );
            return (
              <Card key={b._id}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          #{b.bookingNumber} · {b.category?.name}
                        </h3>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {b.city?.name} · {b.locality || 'Area not specified'} · {new Date(b.scheduledFor).toLocaleString()} · ₹{b.finalPrice ?? b.priceEstimate}
                      </p>
                      <p className="text-sm">
                        Customer: {b.customer?.name || b.customer?.phone} · Payment {b.paymentStatus}
                      </p>
                      {b.address ? <p className="text-sm text-muted-foreground">Address: {b.address}</p> : null}
                      {!b.locality ? <p className="text-sm font-medium text-amber-700">Area missing on this older booking — verify the address before forwarding.</p> : null}
                    </div>

                    {b.status === 'requested' && <Button onClick={() => advance(b, 'confirmed')}>Confirm</Button>}

                    {b.status === 'confirmed' && (
                      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-start lg:w-auto">
                        <select
                          multiple
                          size={Math.min(4, Math.max(2, matchingWorkers?.length || 2))}
                          className="min-h-24 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm sm:min-w-80"
                          value={selectedWorkers[b._id] || []}
                          onChange={(e) => setSelectedWorkers({ ...selectedWorkers, [b._id]: Array.from(e.target.selectedOptions).map((o) => o.value) })}
                        >
                          <option value="" disabled>Select approved providers (Ctrl/Cmd for multiple)</option>
                          {matchingWorkers?.map((w) => (
                            <option key={w._id} value={w._id}>
                              {w.name} · {w.availability === 'available' ? 'Online' : 'Offline'}
                            </option>
                          ))}
                        </select>
                        {!matchingWorkers?.length ? (
                          <p className="max-w-xs text-sm text-muted-foreground">
                            No approved provider matches this city/category. Verify the worker under Workers and add the service area.
                          </p>
                        ) : null}
                        <Button
                          className="shrink-0"
                          disabled={!selectedWorkers[b._id]?.length || forwardBooking.isPending}
                          onClick={() =>
                            forwardBooking.mutate(
                              { id: b._id, workerIds: selectedWorkers[b._id] },
                              {
                                onSuccess: () => toast.success('Request forwarded to providers.'),
                                onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Forwarding failed.'),
                              }
                            )
                          }
                        >
                          Forward request
                        </Button>
                      </div>
                    )}

                    {b.status === 'assigned' && <Button onClick={() => advance(b, 'in_progress')}>Start service</Button>}

                    {b.status === 'in_progress' && (
                      <Button
                        onClick={() => {
                          setCompleteTarget(b);
                          setFinalPrice(String(b.priceEstimate));
                        }}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!data?.data.length && <p className="text-sm text-muted-foreground">No bookings in this status.</p>}
        </div>
      )}

      <Dialog open={!!completeTarget} onOpenChange={(open) => !open && setCompleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete booking #{completeTarget?.bookingNumber}?</DialogTitle>
            <DialogDescription>Confirm the final price charged to the customer.</DialogDescription>
          </DialogHeader>
          <Input type="number" placeholder="Final price" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!finalPrice || updateStatus.isPending}
              onClick={() =>
                completeTarget &&
                updateStatus.mutate(
                  { id: completeTarget._id, status: 'completed', finalPrice: Number(finalPrice) },
                  {
                    onSuccess: () => {
                      toast.success('Booking completed.');
                      setCompleteTarget(null);
                    },
                    onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to complete booking.'),
                  }
                )
              }
            >
              {updateStatus.isPending ? 'Please wait…' : 'Mark completed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
