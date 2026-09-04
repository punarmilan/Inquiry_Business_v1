import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCreateTemplateSticker,
  useDeleteTemplateSticker,
  useTemplateStickersList,
  useUpdateTemplateSticker,
} from '@/hooks/useHyperlocal';
import type { TemplateStickerRecord } from '@/api/hyperlocal';
import { uploadTemplateAsset } from '@/api/hyperlocal';

type StickerForm = {
  name: string; slug: string; kind: 'emoji' | 'image'; imageUrl: string; emoji: string; sortOrder: string; isActive: boolean;
};

const emptyForm: StickerForm = { name: '', slug: '', kind: 'emoji', imageUrl: '', emoji: '⭐', sortOrder: '0', isActive: true };

const fromSticker = (sticker: TemplateStickerRecord): StickerForm => ({
  name: sticker.name,
  slug: sticker.slug,
  kind: sticker.kind,
  imageUrl: sticker.imageUrl || '',
  emoji: sticker.emoji || '',
  sortOrder: String(sticker.sortOrder || 0),
  isActive: sticker.isActive,
});

export const StickerCatalog = () => {
  const { data: stickers, isLoading } = useTemplateStickersList();
  const createSticker = useCreateTemplateSticker();
  const updateSticker = useUpdateTemplateSticker();
  const deleteSticker = useDeleteTemplateSticker();
  const [form, setForm] = useState<StickerForm>(emptyForm);
  const [editing, setEditing] = useState('');

  const save = () => {
    if (!form.name.trim() || !form.slug.trim()) return toast.error('Sticker name and slug are required.');
    if (form.kind === 'emoji' && !form.emoji.trim()) return toast.error('Add an emoji for this sticker.');
    if (form.kind === 'image' && !form.imageUrl.trim()) return toast.error('Add an image URL for this sticker.');
    const payload = { ...form, name: form.name.trim(), slug: form.slug.trim().toLowerCase(), sortOrder: Number(form.sortOrder) || 0 };
    const options = {
      onSuccess: () => { toast.success(editing ? 'Sticker updated.' : 'Sticker added.'); setEditing(''); setForm(emptyForm); },
      onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Could not save sticker.'),
    };
    if (editing) updateSticker.mutate({ id: editing, payload }, options);
    else createSticker.mutate(payload, options);
  };

  const saving = createSticker.isPending || updateSticker.isPending;
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const value = String(reader.result || '');
        const asset = await uploadTemplateAsset(value, file.name);
        setForm((current) => ({ ...current, kind: 'image', imageUrl: asset.url }));
        toast.success('Sticker image uploaded.');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Could not upload sticker image.');
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  return <Card>
    <CardHeader><CardTitle>Sticker catalog</CardTitle><p className="text-sm text-muted-foreground">Add emoji or image stickers here. They appear in the mobile editor's Stickers panel.</p></CardHeader>
    <CardContent className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm font-medium">Name<Input value={form.name} placeholder="Limited time" onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') })} /></label>
        <label className="space-y-1 text-sm font-medium">Slug<Input value={form.slug} placeholder="limited-time" onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /></label>
        <label className="space-y-1 text-sm font-medium">Type<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as StickerForm['kind'] })}><option value="emoji">Emoji</option><option value="image">Image URL</option></select></label>
        {form.kind === 'emoji' ? <label className="space-y-1 text-sm font-medium">Emoji<Input value={form.emoji} maxLength={20} placeholder="⭐" onChange={(e) => setForm({ ...form, emoji: e.target.value })} /></label> : <label className="space-y-1 text-sm font-medium md:col-span-2">Image URL<Input value={form.imageUrl} placeholder="https://..." onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /><span className="mt-1 flex items-center gap-2 text-xs font-normal text-muted-foreground">or upload <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadImage} /></span></label>}
        <label className="space-y-1 text-sm font-medium">Display order<Input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></label>
      </div>
      <div className="flex flex-wrap gap-2"><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update sticker' : 'Add sticker'}</Button>{editing && <Button variant="outline" onClick={() => { setEditing(''); setForm(emptyForm); }}>Cancel</Button>}</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading stickers…</p> : stickers?.map((sticker) => <div key={sticker._id} className="flex items-center gap-3 rounded-lg border p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-3xl">{sticker.kind === 'image' && sticker.imageUrl ? <img src={sticker.imageUrl} alt="" className="h-full w-full object-contain" /> : sticker.emoji || '★'}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{sticker.name}</p><p className="text-xs text-muted-foreground">{sticker.isActive ? 'Active' : 'Inactive'}</p></div>
          <div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => { setEditing(sticker._id); setForm(fromSticker(sticker)); }}>Edit</Button><Button variant="ghost" size="sm" onClick={() => deleteSticker.mutate(sticker._id, { onSuccess: () => toast.success('Sticker deactivated.') })}>Hide</Button></div>
        </div>)}
      </div>
    </CardContent>
  </Card>;
};
