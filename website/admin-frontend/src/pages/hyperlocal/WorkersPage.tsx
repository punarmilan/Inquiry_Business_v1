import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCitiesList, useCategoriesList, useWorkersList, useCreateWorker, useCreateDemoWorkers, useSetDummyProviderNumbers, useDeleteWorker } from '@/hooks/useHyperlocal';

const emptyForm = { name: '', phone: '', whatsapp: '', cityId: '', categoryIds: [] as string[], serviceAreas: '' };

export const WorkersPage = () => {
  const [form, setForm] = useState(emptyForm);
  const [demoCityId, setDemoCityId] = useState('');
  const { data: cities } = useCitiesList();
  const { data: categories } = useCategoriesList();
  const { data: workers, isLoading } = useWorkersList({ limit: 100 });
  const createWorker = useCreateWorker();
  const createDemoWorkers = useCreateDemoWorkers();
  const setDummyProviderNumbers = useSetDummyProviderNumbers();
  const deleteWorker = useDeleteWorker();
  const serviceCities = cities?.filter((city) => city.servicesEnabled && city.isActive) || [];
  const activeCategories = categories?.filter((category) => category.isActive) || [];

  useEffect(() => {
    if (!demoCityId && serviceCities[0]) setDemoCityId(serviceCities[0]._id);
  }, [demoCityId, cities]);

  const handleCreateDemoProviders = () => {
    if (!demoCityId || !activeCategories.length) {
      toast.error('Create an active city and categories first.');
      return;
    }
    createDemoWorkers.mutate(
      { cityId: demoCityId, categoryIds: activeCategories.map((category) => category._id) },
      {
        onSuccess: (result) => toast.success(`${result.created} demo providers added. ${result.skipped} already existed.`),
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to add demo providers.'),
      },
    );
  };

  const handleCreate = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.cityId || !form.categoryIds.length) {
      toast.error('Name, phone, location and category are required.');
      return;
    }
    createWorker.mutate(
      {
        name: form.name.trim(), phone: form.phone.trim(), whatsapp: form.whatsapp.trim(), cityId: form.cityId,
        categoryIds: form.categoryIds, serviceAreas: form.serviceAreas.split(',').map((area) => area.trim()).filter(Boolean),
      },
      {
        onSuccess: () => { toast.success('Provider added to the directory.'); setForm({ ...emptyForm }); },
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to add provider.'),
      },
    );
  };

  const handleSetDummyNumbers = () => {
    if (!window.confirm('Set all provider numbers to 0000000000, 0000000001, 0000000002 and so on?')) return;
    setDummyProviderNumbers.mutate(undefined, {
      onSuccess: (result) => toast.success(`${result.updated} provider numbers updated.`),
      onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to update provider numbers.'),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Service Providers" description="Add the contact details customers will see in the Services directory." />
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Replace provider contact numbers with dummy sequential numbers for testing.</p>
          <Button variant="outline" onClick={handleSetDummyNumbers} disabled={setDummyProviderNumbers.isPending || isLoading}>
            {setDummyProviderNumbers.isPending ? 'Updating numbers…' : 'Use dummy provider numbers'}
          </Button>
        </CardContent>
      </Card>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Add demo providers</CardTitle>
          <p className="text-sm text-muted-foreground">Create 8 directory providers for every active service category. They are regular provider records and can be removed later.</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select className="h-10 min-w-56 rounded-md border border-input bg-background px-3 text-sm" value={demoCityId} onChange={(e) => setDemoCityId(e.target.value)}>
            <option value="">Select location</option>
            {serviceCities.map((city) => <option key={city._id} value={city._id}>{city.name}</option>)}
          </select>
          <Button onClick={handleCreateDemoProviders} disabled={createDemoWorkers.isPending || !demoCityId || !activeCategories.length}>
            {createDemoWorkers.isPending ? 'Adding demo providers…' : `Add 8 per category (${activeCategories.length * 8})`}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Add provider</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Provider name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Phone number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="WhatsApp number (optional)" type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.cityId} onChange={(e) => setForm({ ...form, cityId: e.target.value })}>
            <option value="">Select location</option>
            {cities?.filter((city) => city.servicesEnabled && city.isActive).map((city) => <option key={city._id} value={city._id}>{city.name}</option>)}
          </select>
          <select multiple className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.categoryIds} onChange={(e) => setForm({ ...form, categoryIds: Array.from(e.target.selectedOptions).map((option) => option.value) })}>
            {categories?.filter((category) => category.isActive).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
          <Input placeholder="Areas (comma separated, optional)" value={form.serviceAreas} onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })} />
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Providers are listed directly. No provider login or booking request is created.</p>
            <Button onClick={handleCreate} disabled={createWorker.isPending}>{createWorker.isPending ? 'Adding…' : 'Add provider'}</Button>
          </div>
        </CardContent>
      </Card>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading providers…</p> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workers?.data.map((provider) => (
            <Card key={provider._id}>
              <CardHeader><CardTitle className="flex items-center justify-between text-base">{provider.name}<StatusBadge status={provider.isActive ? 'active' : 'inactive'} /></CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{provider.phone}{provider.whatsapp ? ` · WhatsApp: ${provider.whatsapp}` : ''}</p>
                <p>{provider.city?.name || 'Location unavailable'}</p>
                <p>{provider.categories?.map((category) => category.name).join(', ') || '—'}</p>
                <p className="text-muted-foreground">Areas: {provider.serviceAreas?.join(', ') || 'All areas in location'}</p>
                {provider.isActive && <Button size="sm" variant="destructive" onClick={() => { if (!window.confirm(`Remove ${provider.name} from the directory?`)) return; deleteWorker.mutate(provider._id, { onSuccess: () => toast.success('Provider removed.'), onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to remove provider.') }); }} disabled={deleteWorker.isPending}>Remove</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
