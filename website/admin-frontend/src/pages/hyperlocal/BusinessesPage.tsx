import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Buildings } from '@phosphor-icons/react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/components/shared/SectionCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBusinessesList, useHardDeleteBusiness, useModerateBusiness } from '@/hooks/useHyperlocal';
import { useSeededSearch } from '@/hooks/useSeededSearch';
import type { BusinessRecord } from '@/api/hyperlocal';

export const BusinessesPage = () => {
  const [noteTarget, setNoteTarget] = useState<{ business: BusinessRecord; action: 'rejected' | 'suspended' | 'delete' } | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<BusinessRecord | null>(null);
  const [note, setNote] = useState('');
  const [search, setSearch] = useSeededSearch();
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useBusinessesList({ limit: 100 });
  const moderateBusiness = useModerateBusiness();
  const hardDeleteBusiness = useHardDeleteBusiness();

  const filtered = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((b) => {
      const q = search.toLowerCase();
      const matchesSearch = !search ||
        b.name.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.city?.name?.toLowerCase().includes(q) ||
        b.owner?.name?.toLowerCase().includes(q) ||
        b.phone?.includes(search) ||
        b.whatsapp?.includes(search);
      const matchesStatus = !statusFilter || b.verificationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.data, search, statusFilter]);

  const apply = (business: BusinessRecord, status: string, isActive = true, verificationNote = '') =>
    moderateBusiness.mutate(
      { id: business._id, payload: { verificationStatus: status, verificationNote, isActive } },
      {
        onSuccess: () => { toast.success('Business updated.'); setNoteTarget(null); setNote(''); },
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to update business.'),
      }
    );

  return (
    <div className="space-y-4">
      <PageHeader title="Businesses" description="Review ownership, verification, plans, offers and suspension state." />

      <SectionCard title="Businesses" className="p-0">
        <div className="p-4 border-b">
          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            onClearSearch={() => setSearch('')}
            filters={[{
              key: 'status',
              label: 'Verification',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'pending', label: 'Pending' },
                { value: 'verified', label: 'Verified' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'suspended', label: 'Suspended' },
              ],
            }]}
          />
        </div>
        <div className="p-4">
          {isLoading ? (
            <EmptyState title="Loading businesses…" />
          ) : filtered.length ? (
            <div className="space-y-2">
              {filtered.map((b) => (
                <div key={b._id} className="group rounded-lg border bg-card hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3 p-3">
                    {(b.coverImageUrl || b.logoUrl) ? (
                      <img src={b.coverImageUrl || b.logoUrl} alt="" className="h-10 w-10 rounded-lg border object-cover flex-shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <Buildings className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate">{b.name}</h4>
                        <StatusBadge status={b.verificationStatus} />
                        {!b.isActive && <span className="text-xs text-destructive font-medium">Inactive</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {b.category} · {b.city?.name || '—'} · {b.phone}
                        {b.owner?.name ? ` · Owner: ${b.owner.name}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {b.verificationStatus !== 'verified' && b.verificationStatus !== 'suspended' && (
                        <Button size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={() => apply(b, 'verified')} disabled={moderateBusiness.isPending}>
                          Verify
                        </Button>
                      )}
                      {b.verificationStatus !== 'verified' && b.verificationStatus !== 'rejected' && b.verificationStatus !== 'suspended' && (
                        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => setNoteTarget({ business: b, action: 'rejected' })}>
                          Reject
                        </Button>
                      )}
                      {b.verificationStatus === 'verified' && (
                        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => setNoteTarget({ business: b, action: 'suspended' })}>
                          Suspend
                        </Button>
                      )}
                      {b.verificationStatus === 'verified' && b.isActive && (
                        <Button size="sm" variant="destructive" className="h-7 px-2.5 text-xs" onClick={() => setNoteTarget({ business: b, action: 'delete' })}>
                          Remove
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" className="h-7 px-2.5 text-xs" onClick={() => setHardDeleteTarget(b)}>
                        Delete
                      </Button>
                    </div>
                    {expandedId === b._id && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setExpandedId(null)}>
                        Collapse
                      </Button>
                    )}
                  </div>

                  {expandedId === b._id && (
                    <div className="border-t px-4 py-3 text-xs text-muted-foreground space-y-1">
                      {b.description && <p className="text-foreground">{b.description}</p>}
                      <p>Area: {b.locality || b.addressDetails?.area || 'Not supplied'}</p>
                      <p>Address: {b.address}</p>
                      <p>Phone: {b.phone}{b.whatsapp ? ` · WhatsApp: ${b.whatsapp}` : ''}</p>
                      {(b.email || b.website) && <p>{[b.email, b.website].filter(Boolean).join(' · ')}</p>}
                      {b.verificationSubmittedAt && <p>Submitted: {new Date(b.verificationSubmittedAt).toLocaleString()}</p>}
                      {b.verificationStatus === 'pending' && (
                        <p className="font-medium text-amber-700">Owner has been told to expect approval within 24 hours.</p>
                      )}
                    </div>
                  )}

                  {expandedId !== b._id && (b.description || b.email || b.website) && (
                    <button
                      className="block w-full border-t px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/30 text-left"
                      onClick={() => setExpandedId(b._id)}
                    >
                      View details…
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Buildings className="h-8 w-8" />}
              title="No businesses found"
              description={search ? 'Try adjusting your search or filters.' : 'No businesses have been registered yet.'}
            />
          )}
        </div>
      </SectionCard>

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
            <Button variant="outline" onClick={() => setNoteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!note.trim() || moderateBusiness.isPending}
              onClick={() => noteTarget && apply(noteTarget.business, noteTarget.action === 'rejected' ? 'rejected' : 'suspended', noteTarget.action !== 'delete', note.trim())}
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
        confirmLabel="Delete Permanently"
        loading={hardDeleteBusiness.isPending}
        onConfirm={() => hardDeleteTarget && hardDeleteBusiness.mutate(hardDeleteTarget._id, {
          onSuccess: () => { toast.success('Business permanently deleted.'); setHardDeleteTarget(null); },
          onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to permanently delete business.'),
        })}
      />
    </div>
  );
};
