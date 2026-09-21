import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, MoreHorizontal, Plus } from 'lucide-react';
import { OfferPosterPreview } from '@/components/hyperlocal/OfferPosterPreview';
import { getHomeShowcase, listShowcasePosters, updateHomeShowcase, uploadTemplateAsset } from '@/api/hyperlocal';
import type { HomeShowcase, OfferRecord } from '@/api/hyperlocal';

const empty: HomeShowcase = { banner: { imageUrl: '', title: '', subtitle: '', buttonText: '' }, trendingOfferIds: [] };
const isUserPoster = (offer: OfferRecord) => Boolean(
  (offer.cardDesign?.canvas && offer.cardDesign.canvas.width > 0 && offer.cardDesign.canvas.height > 0 && offer.cardDesign.canvas.elements?.length)
  || (offer.cardDesign?.templateId === 'poster-upload' && offer.imageUrls?.[0])
);
const canSelectPoster = (offer: OfferRecord) => isUserPoster(offer)
  && offer.status === 'approved' && offer.isActive === true
  && Boolean(offer.startsAt && new Date(offer.startsAt).getTime() <= Date.now())
  && Boolean(offer.expiresAt && new Date(offer.expiresAt).getTime() >= Date.now())
  && offer.business?.isActive === true && offer.business.verificationStatus === 'verified'
  && offer.city?.isActive === true && offer.city.offersEnabled === true;
export const HomeShowcasePage = () => {
  const [showcase, setShowcase] = useState<HomeShowcase>(empty);
  const [selected, setSelected] = useState<OfferRecord[]>([]);
  const [candidates, setCandidates] = useState<OfferRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOffer, setPreviewOffer] = useState<OfferRecord | null>(null);
  const [activeSection, setActiveSection] = useState<'trending' | 'banner'>('trending');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAllSelected, setShowAllSelected] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);

  useEffect(() => {
    getHomeShowcase().then(({ showcase: value, selectedOffers }) => {
      setShowcase(value);
      setSelected(selectedOffers);
    }).catch(() => toast.error('Could not load home showcase.')).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    setCandidateLoading(true);
    listShowcasePosters({ page, limit: 30, search: appliedSearch || undefined })
      .then((result) => { if (!cancelled) { setCandidates(result.data); setPages(result.pagination.pages || 1); } })
      .catch(() => { if (!cancelled) toast.error('Could not load user posters.'); })
      .finally(() => { if (!cancelled) setCandidateLoading(false); });
    return () => { cancelled = true; };
  }, [pickerOpen, page, appliedSearch]);

  const changeBanner = (key: keyof HomeShowcase['banner'], value: string) =>
    setShowcase((current) => ({ ...current, banner: { ...current.banner, [key]: value } }));
  const uploadImage = async (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) {
      toast.error('Choose a PNG, JPG or WebP image under 6 MB.');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const asset = await uploadTemplateAsset(dataUrl, file.name);
      changeBanner('imageUrl', asset.url);
      toast.success('Banner image uploaded. Save to publish it.');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Image upload failed.');
    } finally { setUploading(false); }
  };
  const addOffer = (offer: OfferRecord) => {
    if (!canSelectPoster(offer) || selected.some((item) => item._id === offer._id) || selected.length >= 12) return;
    setSelected((items) => [...items, offer]);
  };
  const move = (index: number, direction: -1 | 1) => {
    setSelected((items) => {
      const next = [...items];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  };
  const save = async () => {
    setSaving(true);
    try {
      const next = { ...showcase, trendingOfferIds: selected.map((offer) => offer._id) };
      await updateHomeShowcase(next);
      setShowcase(next);
      toast.success('Home showcase published.');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Could not save home showcase.');
    } finally { setSaving(false); }
  };

  const invalidSelectedCount = selected.filter((offer) => !canSelectPoster(offer)).length;
  const visibleSelected = showAllSelected ? selected : selected.slice(0, 3);

  if (loading) return <p className="p-6">Loading home showcase...</p>;
  return <div className="mx-auto max-w-5xl space-y-5 pb-10">
    <PageHeader title="Home Showcase" description="Manage the banner and the user posters shown on the Offers home screen." actions={
      <Button onClick={save} disabled={saving || uploading}>{saving ? 'Publishing...' : 'Publish changes'}</Button>
    } />

    <div className="w-full max-w-sm space-y-1.5">
      <label htmlFor="showcase-section" className="text-sm font-medium">Edit section</label>
      <Select value={activeSection} onValueChange={(value) => setActiveSection(value as 'trending' | 'banner')}>
        <SelectTrigger id="showcase-section"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="trending">Trending Near You · {selected.length} posters</SelectItem>
          <SelectItem value="banner">Promo banner</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {activeSection === 'trending' ? <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Trending posters</h2><p className="text-sm text-muted-foreground">Choose published user posters. Each takes a turn in the large card.</p></div>
        <Button onClick={() => { setCandidateLoading(true); setPickerOpen(true); }} disabled={selected.length >= 12}><Plus className="mr-2 h-4 w-4" />Add user posters</Button>
      </div>
      <div className="flex items-center justify-between border-b pb-2 text-sm"><span className="font-medium">Selected posters</span><span className="text-muted-foreground">{selected.length} / 12</span></div>
      {invalidSelectedCount > 0 && <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{invalidSelectedCount} selected poster{invalidSelectedCount === 1 ? '' : 's'} can no longer be published. Remove them from the list.</p>}
      {visibleSelected.length ? <div className="space-y-2">{visibleSelected.map((offer, index) => <div key={offer._id} className="flex items-center gap-3 rounded-lg border px-2 py-2 sm:px-3">
        <span className="w-5 shrink-0 text-center text-sm font-semibold text-muted-foreground">{index + 1}</span>
        <OfferPosterPreview offer={offer} width={60} height={60} />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{offer.title}</p><p className="truncate text-xs text-muted-foreground">{offer.business?.name || 'Business'} · {offer.city?.name || 'City'}</p>{!canSelectPoster(offer) && <p className="text-xs text-destructive">Unavailable — remove before publishing</p>}</div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewOffer(offer)}>Preview</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" aria-label={`Actions for ${offer.title}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={index === 0} onSelect={() => move(index, -1)}>Move up</DropdownMenuItem>
            <DropdownMenuItem disabled={index === selected.length - 1} onSelect={() => move(index, 1)}>Move down</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={() => setSelected((items) => items.filter((item) => item._id !== offer._id))}>Remove poster</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>)}</div> : <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No posters selected yet. Add a published user poster to start.</p>}
      {selected.length > 3 && <Button type="button" variant="ghost" size="sm" onClick={() => setShowAllSelected((value) => !value)} aria-expanded={showAllSelected}><ChevronDown className={`mr-2 h-4 w-4 transition-transform ${showAllSelected ? 'rotate-180' : ''}`} />{showAllSelected ? 'Show fewer posters' : `Show all ${selected.length} posters`}</Button>}
    </section> : <section className="space-y-5 rounded-xl border bg-card p-4 sm:p-5">
      <div><h2 className="text-lg font-semibold">Promo banner</h2><p className="text-sm text-muted-foreground">Edit the image and text shown above Trending Near You.</p></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
        <div className="space-y-4">
          <label className="block space-y-1 text-sm font-medium">Headline<Input maxLength={100} value={showcase.banner.title} onChange={(e) => changeBanner('title', e.target.value)} placeholder="Support Local Business" /></label>
          <label className="block space-y-1 text-sm font-medium">Description<Input maxLength={180} value={showcase.banner.subtitle} onChange={(e) => changeBanner('subtitle', e.target.value)} placeholder="Great offers. Real people." /></label>
          <label className="block space-y-1 text-sm font-medium">Button text<Input maxLength={40} value={showcase.banner.buttonText} onChange={(e) => changeBanner('buttonText', e.target.value)} placeholder="Explore Offers" /></label>
          <label className="block space-y-1 text-sm font-medium">Banner image<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => { void uploadImage(e.target.files?.[0]); e.target.value = ''; }} className="block w-full text-sm" /></label>
          {uploading && <p className="text-sm text-muted-foreground">Uploading image...</p>}
          <details className="rounded-lg border px-3 py-2 text-sm"><summary className="cursor-pointer font-medium">Image URL (advanced)</summary><label className="mt-3 block space-y-1">Image URL<Input value={showcase.banner.imageUrl} onChange={(e) => changeBanner('imageUrl', e.target.value)} placeholder="https://..." /></label></details>
        </div>
        <div className="space-y-2"><p className="text-sm font-medium">Preview</p><div className="relative aspect-[3/1] overflow-hidden rounded-xl bg-teal-900">
          {showcase.banner.imageUrl && <img src={showcase.banner.imageUrl} alt="Banner preview" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent p-4 text-white"><p className="text-lg font-bold">{showcase.banner.title || 'Support Local Business'}</p><p className="text-xs">{showcase.banner.subtitle || 'Great offers. Real people.'}</p>{showcase.banner.buttonText && <span className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-900">{showcase.banner.buttonText}</span>}</div>
        </div><p className="text-xs text-muted-foreground">Use a wide image without text. The app draws your headline and button over it.</p></div>
      </div>
    </section>}

    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
        <DialogHeader><DialogTitle>Add user posters</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Select approved posters already published by users. No new upload is needed.</p>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setAppliedSearch(search.trim()); }}><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posters by title" /><Button type="submit">Search</Button></form>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {candidateLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading posters...</p> : candidates.length ? <div className="grid gap-2 md:grid-cols-2">{candidates.map((offer) => {
            const added = selected.some((item) => item._id === offer._id);
            return <div key={offer._id} className="flex items-center gap-2 rounded-lg border p-2">
              <OfferPosterPreview offer={offer} width={76} height={76} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{offer.title}</p><p className="truncate text-xs text-muted-foreground">{offer.business?.name || 'Business'} · {offer.city?.name || 'City'}</p></div>
              <div className="flex shrink-0 flex-col gap-1"><Button type="button" variant="ghost" size="sm" onClick={() => setPreviewOffer(offer)}>Preview</Button><Button type="button" variant="outline" size="sm" disabled={!canSelectPoster(offer) || selected.length >= 12 || added} onClick={() => addOffer(offer)}>{added ? 'Added' : 'Add'}</Button></div>
            </div>;
          })}</div> : <p className="py-8 text-center text-sm text-muted-foreground">No published user posters found.</p>}
        </div>
        <div className="flex items-center justify-between border-t pt-3"><span className="text-sm text-muted-foreground">{selected.length} / 12 selected</span><div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={page <= 1 || candidateLoading} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm">{page} / {pages}</span><Button type="button" variant="outline" size="sm" disabled={page >= pages || candidateLoading} onClick={() => setPage(page + 1)}>Next</Button></div></div>
      </DialogContent>
    </Dialog>
    <Dialog open={!!previewOffer} onOpenChange={(open) => !open && setPreviewOffer(null)}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>{previewOffer?.title || 'Offer poster'}</DialogTitle></DialogHeader>
        {previewOffer && <div className="space-y-4">
          <div><p className="mb-2 text-sm font-medium">Full poster</p><OfferPosterPreview offer={previewOffer} width={300} height={380} /></div>
          <div><p className="mb-2 text-sm font-medium">Trending card sizes</p><div className="flex flex-wrap items-end gap-3"><OfferPosterPreview offer={previewOffer} width={205} height={218} /><OfferPosterPreview offer={previewOffer} width={125} height={105} /></div></div>
        </div>}
      </DialogContent>
    </Dialog>
  </div>;
};
