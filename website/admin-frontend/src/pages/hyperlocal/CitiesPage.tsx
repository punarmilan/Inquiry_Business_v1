import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { MapPinned, Plus, Search, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadTemplateAsset } from '@/api/hyperlocal';
import type { CityRecord } from '@/api/hyperlocal';
import { useCitiesList, useCreateCity, useDeleteCity, useUpdateCity } from '@/hooks/useHyperlocal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { PUNE_CITY_PRESET } from '@/data/puneLocalities';

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

const fieldClass = 'space-y-2';
const labelClass = 'text-sm font-medium text-foreground';
const MAX_LOCALITIES = 500;

export const CitiesPage = () => {
  const [form, setForm] = useState<CityForm>(emptyForm);
  const [editing, setEditing] = useState('');
  const [areaDraft, setAreaDraft] = useState('');
  const [areaDraftImage, setAreaDraftImage] = useState('');
  const [localitySearch, setLocalitySearch] = useState('');

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

  const applyPunePreset = () => {
    setForm((current) => ({
      ...current,
      ...PUNE_CITY_PRESET,
      localities: normalizeLocalities([...PUNE_CITY_PRESET.localities]),
    }));
    setAreaDraft('');
    setAreaDraftImage('');
    setLocalitySearch('');
    toast.success(`${PUNE_CITY_PRESET.localities.length} Pune and PCMC areas loaded.`);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    const localities = normalizeLocalities(form.localities);
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const serviceRadiusKm = Number(form.serviceRadiusKm);

    if (!form.name.trim() || !form.state.trim() || !form.slug.trim()) {
      toast.error('City name, state and slug are required.');
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
      localityImages: localities.map((name) => ({ name, imageUrl: (form.localityImages[name] || '').trim() })).filter((item) => item.imageUrl),
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

  const uploadLocalityImage = async (locality: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file.');
      return;
    }
    if (file.size > 8_000_000) {
      toast.error('Area image must be smaller than 8 MB.');
      return;
    }
    let dataUrl = '';
    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read image.'));
        reader.onerror = () => reject(new Error('Could not read image.'));
        reader.readAsDataURL(file);
      });
      const asset = await uploadTemplateAsset(dataUrl, `area-${locality}-${file.name}`);
      setForm((current) => ({ ...current, localityImages: { ...current.localityImages, [locality]: asset.url } }));
      toast.success(`${locality} image uploaded.`);
    } catch (error: any) {
      setForm((current) => ({ ...current, localityImages: { ...current.localityImages, [locality]: dataUrl } }));
      toast.warning('Cloudinary unavailable. Image attached locally—save city coverage to keep it.');
    }
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
    document.getElementById('city-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const saving = createCity.isPending || updateCity.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title="Cities & service areas" description="Configure city coverage and manage every supported locality from one place." />

      <Card id="city-form" className="overflow-hidden">
        <CardHeader className="gap-4 border-b bg-muted/20 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="space-y-1.5">
            <CardTitle>{editing ? `Edit ${form.name || 'city'}` : 'Add a city'}</CardTitle>
            <CardDescription>Set the city centre, service radius and searchable area list.</CardDescription>
          </div>
          <Button type="button" variant="outline" className="w-full md:w-auto" onClick={applyPunePreset}>
            <Sparkles className="h-4 w-4" />
            Load Pune + PCMC areas
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form className="space-y-5" onSubmit={save}>
            <section className="space-y-4">
              <div>
                <h3 className="font-semibold">City details</h3>
                <p className="text-sm text-muted-foreground">Enter the city name and state.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className={fieldClass}>
                  <span className={labelClass}>City name</span>
                  <Input placeholder="e.g. Pune" value={form.name} onChange={(event) => updateName(event.target.value)} />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>State</span>
                  <Input placeholder="e.g. Maharashtra" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} />
                </label>
              </div>
            </section>

            <details className="rounded-xl border bg-muted/20 p-4 md:p-5">
              <summary className="cursor-pointer font-semibold">Advanced city settings</summary>
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">Optional technical settings for city coverage.</p>
                <label className={fieldClass}>
                  <span className={labelClass}>URL slug</span>
                  <Input placeholder="e.g. pune" value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} />
                </label>
                <div className="grid gap-4 md:grid-cols-3">
                <label className={fieldClass}>
                  <span className={labelClass}>Latitude</span>
                  <Input type="number" step="any" placeholder="18.5204" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>Longitude</span>
                  <Input type="number" step="any" placeholder="73.8567" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>Service radius (KM)</span>
                  <Input type="number" min="1" max="100" placeholder="35" value={form.serviceRadiusKm} onChange={(event) => setForm({ ...form, serviceRadiusKm: event.target.value })} />
                </label>
                </div>
              </div>
            </details>

            <section className="space-y-4 rounded-xl border bg-muted/20 p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Areas and localities</h3>
                  <p className="text-sm text-muted-foreground">Add area names, then set an optional image URL for each area.</p>
                </div>
                <span className="rounded-full border bg-background px-3 py-1 text-sm font-medium">{form.localities.length} / {MAX_LOCALITIES} areas</span>
              </div>

              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
                <Input value={areaDraft} onChange={(event) => setAreaDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addArea(); } }} placeholder="Area name e.g. Wakad" aria-label="Area name" />
                <Input value={areaDraftImage} onChange={(event) => setAreaDraftImage(event.target.value)} placeholder="Image URL (optional)" aria-label="Area image URL" />
                <label className="inline-flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
                  Upload image
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={uploadDraftAreaImage} />
                </label>
                <Button type="button" onClick={addArea} disabled={!areaDraft.trim()}>
                  <Plus className="h-4 w-4" /> Add area
                </Button>
              </div>

              {form.localities.length > 0 && (
                <>
                  <div className="relative max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search selected areas" value={localitySearch} onChange={(event) => setLocalitySearch(event.target.value)} />
                  </div>
                  <div className="max-h-80 overflow-y-auto rounded-lg border bg-background p-3">
                    <div className="space-y-2">
                      {visibleLocalities.map((locality) => (
                        <div key={locality} className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-2 sm:flex-row sm:items-center">
                          <span className="flex min-w-40 items-center gap-1.5 px-1 text-sm font-medium">
                            {locality}
                            <button type="button" className="rounded-full text-muted-foreground hover:text-destructive" onClick={() => removeLocality(locality)} aria-label={`Remove ${locality}`}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                            {form.localityImages[locality] && <img src={form.localityImages[locality]} alt={`${locality} preview`} className="h-10 w-16 rounded object-cover" />}
                            <Input className="flex-1" placeholder="Area image URL (https://...)" value={form.localityImages[locality] || ''} onChange={(event) => setForm((current) => ({ ...current, localityImages: { ...current.localityImages, [locality]: event.target.value } }))} />
                            <label className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted">
                              Upload image
                              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(event) => uploadLocalityImage(locality, event)} />
                            </label>
                          </div>
                        </div>
                      ))}
                      {!visibleLocalities.length && <p className="py-2 text-sm text-muted-foreground">No selected area matches your search.</p>}
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm((current) => ({ ...current, localities: [] }))}>
                    Clear all areas
                  </Button>
                </>
              )}
            </section>

            <details className="rounded-xl border bg-muted/20 p-4 md:p-5">
              <summary className="cursor-pointer font-semibold">Feature settings</summary>
              <section className="mt-4 grid gap-3 md:grid-cols-3">
              {(
                [
                  ['isActive', 'City active', 'Allow users to select this city'],
                  ['offersEnabled', 'Offers enabled', 'Show and accept local offers'],
                  ['servicesEnabled', 'Services enabled', 'Allow bookings and workers'],
                ] as const
              ).map(([key, title, description]) => (
                <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-muted/30">
                  <input className="mt-1 h-4 w-4 accent-primary" type="checkbox" checked={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </span>
                </label>
              ))}
              </section>
            </details>

            <div className="flex flex-wrap gap-2 border-t pt-5">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save city coverage' : 'Create city'}
              </Button>
              {(editing || form.name || form.localities.length > 0) && (
                <Button type="button" variant="outline" onClick={reset} disabled={saving}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Configured cities</h2>
            <p className="text-sm text-muted-foreground">Review coverage or edit an existing city.</p>
          </div>
          <span className="text-sm text-muted-foreground">{cities?.length || 0} total</span>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading cities…</p>
        ) : cities?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cities.map((city) => (
              <Card key={city._id} className={editing === city._id ? 'border-primary ring-1 ring-primary/30' : ''}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{city.name}</CardTitle>
                      <CardDescription>{city.state} · /{city.slug}</CardDescription>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${city.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {city.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Service radius</p>
                      <p className="font-medium">{city.serviceRadiusKm} KM</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Areas covered</p>
                      <p className="font-medium">{city.localities?.length || 0}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs ${city.offersEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      Offers {city.offersEnabled ? 'on' : 'off'}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${city.servicesEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      Services {city.servicesEnabled ? 'on' : 'off'}
                    </span>
                  </div>
                  {city.localities?.length > 0 && (
                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {city.localities.slice(0, 8).join(', ')}{city.localities.length > 8 ? ` +${city.localities.length - 8} more` : ''}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => edit(city)}>
                      <MapPinned className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => updateCity.mutate(
                        { id: city._id, payload: { isActive: !city.isActive } },
                        {
                          onSuccess: () => toast.success(city.isActive ? 'City deactivated.' : 'City activated.'),
                          onError: (error: any) => toast.error(error?.response?.data?.error?.message || error?.message || 'Failed to update city status.'),
                        },
                      )}
                      disabled={updateCity.isPending}
                    >
                      {city.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const hasDependencies = Boolean(city.dependentCount);
                        const warning = hasDependencies
                          ? `${city.name} has ${city.dependentCount} related records. Delete city and permanently remove its businesses, offers, providers, bookings and city links? This cannot be undone.`
                          : `Permanently delete ${city.name}? This cannot be undone.`;
                        if (!window.confirm(warning)) return;
                        deleteCity.mutate({ id: city._id, force: hasDependencies }, {
                          onSuccess: () => toast.success('City permanently deleted.'),
                          onError: (error: any) => toast.error(error?.response?.data?.error?.message || error?.message || 'Failed to delete city.'),
                        });
                      }}
                      disabled={deleteCity.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                  {city.dependentCount ? <p className="text-xs text-muted-foreground">Delete is blocked while related records exist.</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <MapPinned className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No city configured yet</p>
                <p className="text-sm text-muted-foreground">Load the Pune preset above to get started.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
};
