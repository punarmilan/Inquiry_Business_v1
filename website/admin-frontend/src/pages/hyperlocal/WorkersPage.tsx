import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCitiesList, useCategoriesList, useWorkersList, useCreateWorker, useUpdateWorker } from '@/hooks/useHyperlocal';

const emptyForm = {
  name: '',
  phone: '',
  cityId: '',
  categoryIds: [] as string[],
  experienceYears: '0',
  password: '',
  serviceAreas: '',
  availability: 'offline',
  verificationStatus: 'pending',
  isActive: true,
  internalNotes: '',
};

export const WorkersPage = () => {
  const [form, setForm] = useState(emptyForm);

  const { data: cities } = useCitiesList();
  const { data: categories } = useCategoriesList();
  const { data: workers, isLoading } = useWorkersList({ limit: 100 });
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();

  const handleCreate = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.cityId || !form.categoryIds.length || form.password.length < 6) {
      toast.error('Name, phone, password, city and at least one category are required.');
      return;
    }
    createWorker.mutate(
      { ...form, experienceYears: Number(form.experienceYears), serviceAreas: form.serviceAreas.split(',').map((area) => area.trim()).filter(Boolean) },
      {
        onSuccess: () => {
          toast.success('Worker account created.');
          setForm({ ...emptyForm });
        },
        onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to create worker.'),
      }
    );
  };

  const setVerified = (id: string) =>
    updateWorker.mutate(
      { id, payload: { verificationStatus: 'verified', isActive: true } },
      {
        onSuccess: () => toast.success('Worker verified.'),
        onError: () => toast.error('Failed to verify worker.'),
      }
    );

  const toggleAvailability = (id: string, current: string) =>
    updateWorker.mutate(
      { id, payload: { availability: current === 'available' ? 'offline' : current === 'busy' ? 'offline' : 'available' } },
      { onError: () => toast.error('Failed to update availability.') }
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Providers" description="Add verified providers by city and service area. Customers will see matching providers and can send them direct requests." />

      <Card>
        <CardHeader>
          <CardTitle>Add provider</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            placeholder="Phone (+91...)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            placeholder="Experience years"
            value={form.experienceYears}
            onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
          />
          <Input
            type="password"
            placeholder="Provider login password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.cityId}
            onChange={(e) => setForm({ ...form, cityId: e.target.value })}
          >
            <option value="">Select city</option>
            {cities?.filter((c) => c.servicesEnabled && c.isActive).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            multiple
            className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.categoryIds}
            onChange={(e) => setForm({ ...form, categoryIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}
          >
            {categories?.filter((c) => c.isActive).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input
            placeholder="Internal notes"
            value={form.internalNotes}
            onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
          />
          <Input
            placeholder="Service localities (comma separated)"
            value={form.serviceAreas}
            onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })}
            className="md:col-span-2"
          />
          <Button onClick={handleCreate} disabled={createWorker.isPending} className="md:col-span-3">
            {createWorker.isPending ? 'Creating…' : 'Create worker'}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading workers…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workers?.data.map((w) => (
            <Card key={w._id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {w.name}
                  <StatusBadge status={w.verificationStatus} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {w.phone} · {w.city?.name}
                </p>
                <p>{w.categories?.map((c) => c.name).join(', ') || '—'}</p>
                <p className="text-muted-foreground">
                  {w.availability} · {w.completedBookings} completed · ★ {w.ratingAverage || 'New'}
                </p>
                <p className="text-muted-foreground">Localities: {w.serviceAreas?.join(', ') || 'Not assigned'}</p>
                <div className="flex gap-2 pt-1">
                  {w.verificationStatus !== 'verified' && (
                    <Button size="sm" onClick={() => setVerified(w._id)} disabled={updateWorker.isPending}>
                      Verify
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => toggleAvailability(w._id, w.availability)} disabled={updateWorker.isPending}>
                    {w.availability === 'available' ? 'Set offline' : w.availability === 'busy' ? 'Set offline' : 'Set available'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
