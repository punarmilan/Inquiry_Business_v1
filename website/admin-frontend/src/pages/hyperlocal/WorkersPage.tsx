import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Trash, PencilSimple, Power } from '@phosphor-icons/react';
import type { CategoryRecord, CityRecord, WorkerRecord } from '@/api/hyperlocal';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SectionCard } from '@/components/shared/SectionCard';
import { FormField } from '@/components/shared/FormField';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { CompactDataCard } from '@/components/shared/CompactDataCard';
import { ServiceCategorySelect } from '@/components/hyperlocal/ServiceCategorySelect';
import { ProviderExcelImport } from '@/components/hyperlocal/ProviderExcelImport';
import {
  useCitiesList,
  useCategoriesList,
  useWorkersList,
  useCreateWorker,
  useDeleteWorker,
  useHardDeleteWorker,
  useUpdateWorker,
} from '@/hooks/useHyperlocal';
import { useSeededSearch } from '@/hooks/useSeededSearch';

const emptyForm = {
  name: '',
  phone: '',
  whatsapp: '',
  cityId: '',
  categoryIds: [] as string[],
  serviceAreas: '',
};

const providerPayload = (form: typeof emptyForm) => {
  if (!form.name.trim() || !form.phone.trim() || !form.cityId || !form.categoryIds.length) {
    toast.error('Name, phone, location and category are required.');
    return null;
  }
  return {
    name: form.name.trim(),
    phone: form.phone.trim(),
    whatsapp: form.whatsapp.trim(),
    cityId: form.cityId,
    categoryIds: form.categoryIds,
    serviceAreas: form.serviceAreas.split(',').map((area) => area.trim()).filter(Boolean),
  };
};

const ProviderFields = ({ form, onChange, cities, categories, categoriesLoading, categoriesError, onRetryCategories, disabled, inDialog = false }: {
  form: typeof emptyForm;
  onChange: (form: typeof emptyForm) => void;
  cities: CityRecord[];
  categories: CategoryRecord[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  onRetryCategories: () => void;
  disabled: boolean;
  inDialog?: boolean;
}) => (
  <>
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField label="Provider Name" required>
        <Input placeholder="e.g. Rajesh Plumbing" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} />
      </FormField>
      <FormField label="Phone" required>
        <Input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => onChange({ ...form, phone: e.target.value })} />
      </FormField>
      <FormField label="WhatsApp">
        <Input type="tel" placeholder="+91 98765 43210 (optional)" value={form.whatsapp} onChange={(e) => onChange({ ...form, whatsapp: e.target.value })} />
      </FormField>
      <FormField label="City / Location" required>
        <Select value={form.cityId} onValueChange={(cityId) => onChange({ ...form, cityId })} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
          <SelectContent>
            {cities.map((city) => <SelectItem key={city._id} value={city._id}>{city.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
    </div>
    <ServiceCategorySelect
      id={inDialog ? 'edit-provider-service-categories' : 'provider-service-categories'}
      categories={categories}
      value={form.categoryIds}
      onChange={(categoryIds) => onChange({ ...form, categoryIds })}
      disabled={disabled}
      loading={categoriesLoading}
      error={categoriesError}
      onRetry={onRetryCategories}
      inline={inDialog}
    />
    <FormField label="Service Areas" description="Comma-separated list (optional)">
      <Input placeholder="Wakad, Baner, Aundh" value={form.serviceAreas} onChange={(e) => onChange({ ...form, serviceAreas: e.target.value })} />
    </FormField>
  </>
);

export const WorkersPage = () => {
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editing, setEditing] = useState('');
  const editButtonRef = useRef<HTMLButtonElement | null>(null);
  const [search, setSearch] = useSeededSearch();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [actionTarget, setActionTarget] = useState<{ provider: WorkerRecord; kind: 'deactivate' | 'hard-delete' } | null>(null);

  const { data: cities } = useCitiesList();
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError, refetch: refetchCategories } = useCategoriesList();
  const { data: workers, isLoading, isError, refetch } = useWorkersList({
    page,
    limit: 20,
    search: search.trim() || undefined,
    isActive: statusFilter ? statusFilter === 'active' : undefined,
  });
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const deleteWorker = useDeleteWorker();
  const hardDeleteWorker = useHardDeleteWorker();

  const serviceCities = cities?.filter((city) => city.servicesEnabled && city.isActive) || [];

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => {
    if (workers && page > Math.max(1, workers.pagination.pages)) {
      setPage(Math.max(1, workers.pagination.pages));
    }
  }, [workers, page]);

  const handleCreate = () => {
    if (saving || actionPending) return;
    const payload = providerPayload(form);
    if (!payload) return;
    createWorker.mutate(payload, {
      onSuccess: () => { toast.success('Provider added to the directory.'); setForm({ ...emptyForm }); },
      onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to add provider.'),
    });
  };

  const handleUpdate = () => {
    if (!editing || saving || actionPending) return;
    const payload = providerPayload(editForm);
    if (!payload) return;
    updateWorker.mutate({ id: editing, payload }, {
      onSuccess: () => { toast.success('Provider updated.'); reset(); },
      onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to update provider.'),
    });
  };

  const edit = (provider: WorkerRecord, button: HTMLButtonElement) => {
    editButtonRef.current = button;
    setEditing(provider._id);
    setEditForm({
      name: provider.name,
      phone: provider.phone,
      whatsapp: provider.whatsapp || '',
      cityId: provider.city?._id || '',
      categoryIds: provider.categories?.map((category) => category._id) || [],
      serviceAreas: provider.serviceAreas?.join(', ') || '',
    });
  };

  const reset = () => {
    setEditing('');
    setEditForm(emptyForm);
  };

  const saving = createWorker.isPending || updateWorker.isPending;
  const actionPending = deleteWorker.isPending || hardDeleteWorker.isPending;

  const confirmAction = () => {
    if (!actionTarget || actionPending) return;
    const { provider, kind } = actionTarget;
    const mutation = kind === 'hard-delete' ? hardDeleteWorker : deleteWorker;
    mutation.mutate(provider._id, {
      onSuccess: () => {
        toast.success(kind === 'hard-delete' ? 'Provider permanently deleted.' : 'Provider deactivated.');
        setActionTarget(null);
        if (editing === provider._id) reset();
      },
      onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Could not update the provider. Please try again.'),
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Service Providers" description="Manage service provider directory and assignments." />

      <ProviderExcelImport disabled={saving || actionPending} onImported={() => { setPage(1); setSearch(''); setStatusFilter(''); }} />

      <SectionCard id="provider-form" title="Add Provider" collapsible defaultOpen>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
          <ProviderFields
            form={form}
            onChange={setForm}
            cities={serviceCities}
            categories={categories || []}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
            onRetryCategories={() => void refetchCategories()}
            disabled={saving || actionPending}
          />

          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button type="submit" disabled={saving || actionPending}>
              {createWorker.isPending ? 'Saving…' : 'Add Provider'}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Providers" className="p-0">
        <div className="p-4 border-b">
          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            onClearSearch={() => setSearch('')}
            filters={[
              { key: 'status', label: 'Status', value: statusFilter, onChange: setStatusFilter, options: [
                { value: '', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]},
            ]}
          />
        </div>

        <div className="p-4">
          {isLoading ? (
            <EmptyState icon={<span className="animate-spin">⏳</span>} title="Loading providers…" />
          ) : isError ? (
            <div className="space-y-3 py-6 text-center" role="alert">
              <p className="text-sm text-destructive">Could not load providers. Please try again.</p>
              <Button type="button" variant="outline" onClick={() => void refetch()}>Retry</Button>
            </div>
          ) : workers?.data.length ? (
            <div className="space-y-2">
              {workers.data.map((provider) => (
                <CompactDataCard
                  key={provider._id}
                  title={provider.name}
                  subtitle={provider.city?.name}
                  status={provider.isActive ? 'active' : 'inactive'}
                  fields={[
                    { label: 'Phone', value: provider.phone },
                    { label: 'WhatsApp', value: provider.whatsapp || '—' },
                    { label: 'Categories', value: provider.categories?.map((category) => category.name).join(', ') || '—' },
                  ]}
                  tags={provider.serviceAreas?.slice(0, 3) || []}
                  actions={
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="min-h-11" onClick={(event) => edit(provider, event.currentTarget)} disabled={saving || actionPending} aria-label={`Edit ${provider.name}`}>
                        <PencilSimple aria-hidden="true" /> Edit
                      </Button>
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setActionTarget({ provider, kind: 'deactivate' })} disabled={!provider.isActive || saving || actionPending} aria-label={`Deactivate ${provider.name}`}>
                        <Power aria-hidden="true" /> Deactivate
                      </Button>
                      <Button type="button" variant="destructive" className="min-h-11" onClick={() => setActionTarget({ provider, kind: 'hard-delete' })} disabled={saving || actionPending} aria-label={`Hard delete ${provider.name}`}>
                        <Trash aria-hidden="true" /> Hard Delete
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<span>👥</span>}
              title="No providers found"
              description={search || statusFilter ? 'Try adjusting your search or filters.' : 'Add your first provider using the form above.'}
            />
          )}
        </div>
        {workers && workers.pagination.total > 0 && (
          <nav className="flex flex-wrap items-center justify-between gap-3 border-t p-4" aria-label="Provider pages">
            <p className="text-sm text-muted-foreground">
              {workers.pagination.total} providers · Page {page} of {Math.max(1, workers.pagination.pages)}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1 || actionPending} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <Button type="button" variant="outline" className="min-h-11" disabled={page >= workers.pagination.pages || actionPending} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </nav>
        )}
      </SectionCard>
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !updateWorker.isPending) reset(); }}>
        <DialogContent
          className="flex max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0"
          onEscapeKeyDown={(event) => { if (document.getElementById('edit-provider-service-categories-popup')) event.preventDefault(); }}
          onCloseAutoFocus={(event) => { event.preventDefault(); editButtonRef.current?.focus(); }}
        >
          <DialogHeader className="shrink-0 border-b p-4 pr-12 text-left sm:p-6 sm:pr-12">
            <DialogTitle>Edit Provider</DialogTitle>
            <DialogDescription>Update contact details, location and services.</DialogDescription>
          </DialogHeader>
          <form className="flex min-h-0 flex-col" onSubmit={(event) => { event.preventDefault(); handleUpdate(); }} aria-busy={updateWorker.isPending}>
            <fieldset className="min-h-0 min-w-0 space-y-3 overflow-y-auto p-4 sm:p-6" disabled={updateWorker.isPending}>
              <legend className="sr-only">Provider details</legend>
              <ProviderFields
                form={editForm}
                onChange={setEditForm}
                cities={serviceCities}
                categories={categories || []}
                categoriesLoading={categoriesLoading}
                categoriesError={categoriesError}
                onRetryCategories={() => void refetchCategories()}
                disabled={saving || actionPending}
                inDialog
              />
            </fieldset>
            <DialogFooter className="shrink-0 gap-2 border-t p-4 sm:p-6">
              <Button type="button" variant="outline" className="min-h-11" onClick={reset} disabled={updateWorker.isPending}>Cancel</Button>
              <Button type="submit" className="min-h-11" disabled={saving || actionPending}>
                {updateWorker.isPending ? 'Saving…' : 'Update Provider'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(open) => { if (!open && !actionPending) setActionTarget(null); }}
        title={actionTarget ? `${actionTarget.kind === 'hard-delete' ? 'Permanently delete' : 'Deactivate'} ${actionTarget.provider.name}?` : ''}
        description={actionTarget?.kind === 'hard-delete'
          ? 'This permanently deletes the provider directory entry and cannot be undone. Any linked login account will be deactivated. Providers with booking history cannot be permanently deleted; deactivate them instead.'
          : 'This hides the provider from the directory and deactivates any linked login account. The provider record and booking history are kept.'}
        destructive
        confirmLabel={actionTarget?.kind === 'hard-delete' ? 'Delete Permanently' : 'Deactivate Provider'}
        loading={actionPending}
        onConfirm={confirmAction}
      />
    </div>
  );
};
