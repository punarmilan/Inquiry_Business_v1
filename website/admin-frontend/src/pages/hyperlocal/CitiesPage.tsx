import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { MapPin, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { uploadTemplateAsset } from '@/api/hyperlocal';
import type { CityRecord } from '@/api/hyperlocal';
import { useCitiesList, useCreateCity, useDeleteCity, useUpdateCity } from '@/hooks/useHyperlocal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { FormField } from '@/components/shared/FormField';
import { Chip } from '@/components/shared/Chip';
import { EmptyState } from '@/components/shared/EmptyState';

type CityForm = {
  name: string;
  state: string;
  slug: string;
  latitude: string;
  longitude: string;
  serviceRadiusKm: string;
  localities: string[];
  localityImages: Record<string, string>;
  isActive: boolean;
  offersEnabled: boolean;
  servicesEnabled: boolean;
};

const emptyForm = (): CityForm => ({
  name: '',
  state: '',
  slug: '',
  latitude: '',
  longitude: '',
  serviceRadiusKm: '10',
  localities: [],
  localityImages: {},
  isActive: true,
  offersEnabled: true,
  servicesEnabled: true,
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeLocalities = (values: string[]) => {
  const unique = new Map<string, string>();
  values.forEach((value) => {
    const clean = value.trim().replace(/\s+/g, ' ');
    if (clean) unique.set(clean.toLocaleLowerCase('en-IN'), clean);
  });
  return [...unique.values()].sort((a, b) => a.localeCompare(b, 'en-IN'));
};

const MAX_LOCALITIES = 500;

export const CitiesPage = () => {
  const [form, setForm] = useState<CityForm>(emptyForm);
  const [editing, setEditing] = useState('');
  const [areaDraft, setAreaDraft] = useState('');
  const [areaDraftImage, setAreaDraftImage] = useState('');
  const [localitySearch, setLocalitySearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: cities, isLoading } = useCitiesList();
  const createCity = useCreateCity();
  const updateCity = useUpdateCity();
  const deleteCity = useDeleteCity();

  const visibleLocalities = useMemo(() => {
    const query = localitySearch.trim().toLocaleLowerCase('en-IN');
    return query ? form.localities.filter((locality) => locality.toLocaleLowerCase('en-IN').includes(query)) : form.localities;
  }, [form.localities, localitySearch]);

  const reset = () => {
    setEditing('');
    setForm(emptyForm());
    setAreaDraft('');
    setAreaDraftImage('');
    setLocalitySearch('');
    setShowAdvanced(false);
  };

  const updateName = (name: string) => {
    setForm((current) => ({
      ...current,
      name,
      slug: !current.slug || current.slug === slugify(current.name) ? slugify(name) : current.slug,
    }));
  };

  const addArea = () => {
    const cleanArea = areaDraft.trim().replace(/\s+/g, ' ');
    if (!cleanArea) return;
    if (form.localities.some((locality) => locality.toLocaleLowerCase('en-IN') === cleanArea.toLocaleLowerCase('en-IN'))) {
      toast.error('This area already exists.');
      return;
    }
    const next = normalizeLocalities([...form.localities, cleanArea]);
    if (next.length > MAX_LOCALITIES) {
      toast.error(`A city can contain at most ${MAX_LOCALITIES} areas.`);
      return;
    }
    setForm((current) => ({
      ...current,
      localities: next,
      localityImages: areaDraftImage.trim()
        ? { ...current.localityImages, [cleanArea]: areaDraftImage.trim() }
        : current.localityImages,
    }));
    setAreaDraft('');
    setAreaDraftImage('');
  };

  const removeLocality = (locality: string) => {
    setForm((current) => {
      const localityImages = { ...current.localityImages };
      delete localityImages[locality];
      return { ...current, localities: current.localities.filter((item) => item !== locality), localityImages };
    });
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    const localities = normalizeLocalities(form.localities);
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const serviceRadiusKm = Number(form.serviceRadiusKm);

    if (!form.name.trim() || !form.state.trim() || !form.slug.trim()) {
      toast.error('City name and state are required.');
      return;
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast.error('Enter valid latitude and longitude values.');
      return;
    }
    if (!Number.isFinite(serviceRadiusKm) || serviceRadiusKm < 1 || serviceRadiusKm > 100) {
      toast.error('Service radius must be between 1 and 100 KM.');
      return;
    }
    if (localities.length > MAX_LOCALITIES) {
      toast.error(`A city can contain at most ${MAX_LOCALITIES} areas.`);
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      state: form.state.trim(),
      slug: slugify(form.slug),
      latitude,
      longitude,
      serviceRadiusKm,
      localities,
      localityImages: localities
        .map((name) => ({ name, imageUrl: (form.localityImages[name] || '').trim() }))
        .filter((item) => item.imageUrl),
    };
    const callbacks = {
      onSuccess: () => {
        toast.success(editing ? 'City coverage updated.' : 'City created.');
        reset();
      },
      onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to save city.'),
    };
    if (editing) updateCity.mutate({ id: editing, payload }, callbacks);
    else createCity.mutate(payload, callbacks);
  };

  const uploadDraftAreaImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Choose an image file.');
    if (file.size > 8_000_000) return toast.error('Area image must be smaller than 8 MB.');
    let dataUrl = '';
    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read image.'));
        reader.onerror = () => reject(new Error('Could not read image.'));
        reader.readAsDataURL(file);
      });
      const asset = await uploadTemplateAsset(dataUrl, `area-${areaDraft || 'new'}-${file.name}`);
      setAreaDraftImage(asset.url);
      toast.success('Area image uploaded.');
    } catch (error: any) {
      setAreaDraftImage(dataUrl);
      toast.warning('Cloudinary unavailable. Image will be saved with the city.');
    }
  };

  const edit = (city: CityRecord) => {
    setEditing(city._id);
    setForm({
      name: city.name,
      state: city.state,
      slug: city.slug,
      latitude: String(city.center.coordinates[1]),
      longitude: String(city.center.coordinates[0]),
      serviceRadiusKm: String(city.serviceRadiusKm),
      localities: normalizeLocalities(city.localities || []),
      localityImages: Object.fromEntries((city.localityImages || []).map((item) => [item.name, item.imageUrl])),
      isActive: city.isActive,
      offersEnabled: city.offersEnabled,
      servicesEnabled: city.servicesEnabled,
    });
    setAreaDraft('');
    setAreaDraftImage('');
    setLocalitySearch('');
    setShowAdvanced(!!(city.center.coordinates[0] || city.center.coordinates[1] || city.serviceRadiusKm !== 10));
    document.getElementById('city-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const saving = createCity.isPending || updateCity.isPending;

  return (
    <div className="space-y-4">
      <PageHeader title="Cities & Service Areas" description="Manage city coverage, service radius, and locality mapping." />

      <SectionCard id="city-form" title={editing ? `Edit ${form.name || 'city'}` : 'Add City'} collapsible defaultOpen={!editing}>
        <form className="space-y-4" onSubmit={save}>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="City name" required>
              <Input placeholder="e.g. Pune" value={form.name} onChange={(event) => updateName(event.target.value)} />
            </FormField>
            <FormField label="State" required>
              <Input placeholder="e.g. Maharashtra" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} />
            </FormField>
          </div>

          <SectionCard collapsible defaultOpen={showAdvanced} title="Advanced Settings" description="Optional settings for city coverage.">
            <div className="space-y-3">
              <FormField label="URL Path" description="Auto-generated from city name.">
                <Input placeholder="e.g. pune" value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} />
              </FormField>
              <div className="grid gap-3 md:grid-cols-3">
                <FormField label="Latitude">
                  <Input type="number" step="any" placeholder="18.5204" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} />
                </FormField>
                <FormField label="Longitude">
                  <Input type="number" step="any" placeholder="73.8567" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} />
                </FormField>
                <FormField label="Service Radius (KM)">
                  <Input type="number" min="1" max="100" placeholder="35" value={form.serviceRadiusKm} onChange={(event) => setForm({ ...form, serviceRadiusKm: event.target.value })} />
                </FormField>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Areas & Localities" description={`${form.localities.length} / ${MAX_LOCALITIES} areas added`}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input
                  className="flex-1 min-w-[200px]"
                  value={areaDraft}
                  onChange={(event) => setAreaDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addArea(); } }}
                  placeholder="Area name e.g. Wakad"
                  aria-label="Area name"
                />
                <Input
                  className="flex-1 min-w-[200px]"
                  value={areaDraftImage}
                  onChange={(event) => setAreaDraftImage(event.target.value)}
                  placeholder="Image URL (optional)"
                  aria-label="Area image URL"
                />
                <label className="inline-flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
                  Upload
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={uploadDraftAreaImage} />
                </label>
                <Button type="button" onClick={addArea} disabled={!areaDraft.trim()} size="sm">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>

              {form.localities.length > 0 && (
                <>
                  <div className="relative max-w-md">
                    <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search areas" value={localitySearch} onChange={(event) => setLocalitySearch(event.target.value)} />
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-lg border bg-background p-2">
                    <div className="flex flex-wrap gap-1.5">
                      {visibleLocalities.map((locality) => (
                        <Chip
                          key={locality}
                          label={locality}
                          onRemove={() => removeLocality(locality)}
                          imageUrl={form.localityImages[locality]}
                          variant="with-image"
                        />
                      ))}
                    </div>
                    {!visibleLocalities.length && (
                      <p className="py-2 text-sm text-muted-foreground">No selected area matches your search.</p>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm((current) => ({ ...current, localities: [] }))}>
                    Clear all areas
                  </Button>
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard collapsible defaultOpen={false} title="Feature Toggles">
            <div className="grid gap-3 md:grid-cols-3">
              {([
                ['isActive', 'City Active', 'Allow users to select this city'],
                ['offersEnabled', 'Offers Enabled', 'Show and accept local offers'],
                ['servicesEnabled', 'Services Enabled', 'Allow bookings and workers'],
              ] as const).map(([key, title, description]) => (
                <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/30">
                  <input className="mt-1 h-4 w-4 accent-primary" type="checkbox" checked={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </span>
                </label>
              ))}
            </div>
          </SectionCard>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save City' : 'Create City'}
            </Button>
            {(editing || form.name || form.localities.length > 0) && (
              <Button type="button" variant="outline" onClick={reset} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </SectionCard>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Configured Cities</h2>
          <span className="text-sm text-muted-foreground">{cities?.length || 0} total</span>
        </div>

        {isLoading ? (
          <EmptyState icon={<MapPin className="h-8 w-8" />} title="Loading cities…" />
        ) : cities?.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cities.map((city) => (
              <div key={city._id} className={`group rounded-lg border bg-card shadow-sm hover:shadow-md transition-all p-3 cursor-pointer ${editing === city._id ? 'border-primary ring-1 ring-primary/30' : ''}`} onClick={() => edit(city)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold truncate">{city.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{city.state}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${city.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {city.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                  <span>{city.serviceRadiusKm} KM radius</span>
                  <span>{city.localities?.length || 0} areas</span>
                  <span>Offers: {city.offersEnabled ? 'On' : 'Off'}</span>
                  <span>Services: {city.servicesEnabled ? 'On' : 'Off'}</span>
                </div>
                {city.localities?.length > 0 && (
                  <p className="line-clamp-1 text-xs text-muted-foreground mb-2">
                    {city.localities.slice(0, 5).join(', ')}{city.localities.length > 5 ? ` +${city.localities.length - 5} more` : ''}
                  </p>
                )}
                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs flex-1" onClick={() => edit(city)}>
                    <MapPin className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => updateCity.mutate(
                    { id: city._id, payload: { isActive: !city.isActive } },
                    { onSuccess: () => toast.success(city.isActive ? 'City deactivated.' : 'City activated.'), onError: (error: any) => toast.error(error?.response?.data?.error?.message || 'Failed to update city status.') },
                  )} disabled={updateCity.isPending}>
                    {city.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="destructive" size="sm" className="h-7 px-2.5 text-xs" onClick={() => {
                    const hasDependencies = Boolean(city.dependentCount);
                    const warning = hasDependencies ? `${city.name} has ${city.dependentCount} related records. Delete anyway?` : `Permanently delete ${city.name}?`;
                    if (!window.confirm(warning)) return;
                    deleteCity.mutate({ id: city._id, force: hasDependencies }, {
                      onSuccess: () => toast.success('City permanently deleted.'),
                      onError: (error: any) => toast.error(error?.response?.data?.error?.message || 'Failed to delete city.'),
                    });
                  }} disabled={deleteCity.isPending}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <SectionCard>
            <EmptyState
              icon={<MapPin className="h-8 w-8" />}
              title="No city configured yet"
              description="Add your first city using the form above."
            />
          </SectionCard>
        )}
      </div>
    </div>
  );
};