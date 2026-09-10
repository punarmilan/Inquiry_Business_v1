import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
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
import { useBusinessesList, useHardDeleteBusiness, useModerateBusiness } from '@/hooks/useHyperlocal';
import type { BusinessRecord } from '@/api/hyperlocal';

export const BusinessesPage = () => {
  const [noteTarget, setNoteTarget] = useState<{ business: BusinessRecord; action: 'rejected' | 'suspended' | 'delete' } | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<BusinessRecord | null>(null);
  const [note, setNote] = useState('');

  const { data, isLoading } = useBusinessesList({ limit: 100 });
  const moderateBusiness = useModerateBusiness();
  const hardDeleteBusiness = useHardDeleteBusiness();

  const apply = (business: BusinessRecord, status: string, isActive = true, verificationNote = '') =>
    moderateBusiness.mutate(
      { id: business._id, payload: { verificationStatus: status, verificationNote, isActive } },
      {
        onSuccess: () => {
          toast.success('Business updated.');
          setNoteTarget(null);
          setNote('');
        },
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to update business.'),
      }
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Businesses" description="Review ownership, verification, plans, offers and suspension state." />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading businesses…</p>
      ) : (
        <div className="space-y-3">
          {data?.data.map((b) => (
            <Card key={b._id}>
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start">
                {(b.coverImageUrl || b.logoUrl) && <img src={b.coverImageUrl || b.logoUrl} alt={`${b.name} shop`} className="h-24 w-32 rounded-lg border object-cover" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{b.name}</h3>
                    <StatusBadge status={b.verificationStatus} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {b.category} · {b.city?.name} · {b.phone}
                  </p>
                  <p className="text-sm">Owner: {b.owner?.name || b.owner?.phone}</p>
                  {b.description && <p className="mt-2 text-sm">{b.description}</p>}
                  <p className="text-xs text-muted-foreground">Area: {b.locality || b.addressDetails?.area || 'Not supplied'}</p>
                  <p className="text-xs text-muted-foreground">{b.address}</p>
                  <p className="text-xs text-muted-foreground">Phone: {b.phone}{b.whatsapp ? ` · WhatsApp: ${b.whatsapp}` : ''}</p>
                  {(b.email || b.website) && <p className="text-xs text-muted-foreground">{[b.email, b.website].filter(Boolean).join(' · ')}</p>}
                  {b.verificationStatus === 'pending' && (
                    <p className="mt-1 text-xs font-medium text-amber-700">Owner has been told to expect approval within 24 hours.</p>
                  )}
                  {b.verificationSubmittedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(b.verificationSubmittedAt).toLocaleString()}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {b.verificationStatus !== 'verified' && b.verificationStatus !== 'suspended' && (
                    <Button size="sm" onClick={() => apply(b, 'verified')} disabled={moderateBusiness.isPending}>
                      Verify
                    </Button>
                  )}
                  {b.verificationStatus !== 'verified' && b.verificationStatus !== 'rejected' && b.verificationStatus !== 'suspended' && (
                    <Button size="sm" variant="outline" onClick={() => setNoteTarget({ business: b, action: 'rejected' })}>
                      Reject
                    </Button>
                  )}
                  {b.verificationStatus === 'verified' && <Button size="sm" variant="outline" onClick={() => setNoteTarget({ business: b, action: 'suspended' })}>Suspend</Button>}
                  {b.verificationStatus === 'verified' && b.isActive && <Button size="sm" variant="destructive" onClick={() => setNoteTarget({ business: b, action: 'delete' })}>Soft Delete</Button>}
                  <Button size="sm" variant="destructive" onClick={() => setHardDeleteTarget(b)}>Hard Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!data?.data.length && <p className="text-sm text-muted-foreground">No businesses yet.</p>}
        </div>
      )}

      <Dialog open={!!noteTarget} onOpenChange={(open) => !open && setNoteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {noteTarget?.action === 'delete' ? 'Delete' : noteTarget?.action === 'suspended' ? 'Suspend' : 'Reject'} {noteTarget?.business.name}?
            </DialogTitle>
            <DialogDescription>The owner will see this note.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Moderation note" value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!note.trim() || moderateBusiness.isPending}
              onClick={() =>
                noteTarget && apply(noteTarget.business, noteTarget.action === 'rejected' ? 'rejected' : 'suspended', noteTarget.action !== 'delete', note.trim())
              }
            >
              {moderateBusiness.isPending ? 'Please wait…' : noteTarget?.action === 'delete' ? 'Delete' : noteTarget?.action === 'suspended' ? 'Suspend' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!hardDeleteTarget}
        onOpenChange={(open) => !open && setHardDeleteTarget(null)}
        title={hardDeleteTarget ? `Permanently delete ${hardDeleteTarget.name}?` : ''}
        description="This is non-reversible and is blocked while offers, subscriptions, or payments reference this business."
        destructive
        confirmLabel="Hard Delete"
        loading={hardDeleteBusiness.isPending}
        onConfirm={() => hardDeleteTarget && hardDeleteBusiness.mutate(hardDeleteTarget._id, {
          onSuccess: () => { toast.success('Business permanently deleted.'); setHardDeleteTarget(null); },
          onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to permanently delete business.'),
        })}
      />
    </div>
  );
};
