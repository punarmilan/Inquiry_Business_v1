import { useEffect, useId, useRef, useState } from 'react';
import { UploadSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { uploadUIImage, uiError, type UIAnimationAsset } from '@/api/ui';
import { drawImageCrop, type ImageCrop } from '@/utils/uiImageCrop';

export function UIImageUpload({ onUploaded, compact = false, buttonLabel = 'Change photo', disabled = false }: { onUploaded: (asset: UIAnimationAsset) => void; compact?: boolean; buttonLabel?: string; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const helpId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<ImageCrop>({ ratio: 16 / 9, zoom: 1, x: 50, y: 50 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (!file) { setImage(null); return; }
    const url = URL.createObjectURL(file); const next = new Image(); let disposed = false;
    next.onload = () => {
      if (disposed) return;
      if (next.naturalWidth * next.naturalHeight > 40_000_000) { setError('Choose an image smaller than 40 megapixels.'); return; }
      setImage(next);
    };
    next.onerror = () => { if (!disposed) setError('This image could not be opened. Choose a PNG, JPEG or WebP file.'); };
    next.src = url;
    return () => { disposed = true; URL.revokeObjectURL(url); };
  }, [file]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    try { drawImageCrop(canvas.current, image, crop); } catch (e) { setError(uiError(e)); }
  }, [image, crop]);
  const close = () => { pending.current?.abort(); setBusy(false); setFile(null); setImage(null); setError(''); };
  const range = (label: string, field: 'zoom' | 'x' | 'y', min: number, max: number, step = 1) => <label className="block space-y-2 text-sm"><span className="flex justify-between">{label}<span>{crop[field]}{field === 'zoom' ? '×' : '%'}</span></span><input className="w-full accent-primary" type="range" min={min} max={max} step={step} value={crop[field]} onChange={(e) => setCrop((value) => ({ ...value, [field]: Number(e.target.value) }))} /></label>;
  return <div className="space-y-2">
    {compact && <Button type="button" variant="outline" className="w-full" disabled={disabled || busy} onClick={() => inputRef.current?.click()}><UploadSimple />{buttonLabel}</Button>}
    <label className={compact ? 'sr-only' : 'block cursor-pointer rounded-xl border border-dashed p-3 text-center text-xs font-semibold hover:border-primary'}>{compact ? buttonLabel : <><UploadSimple className="mx-auto mb-1 h-5 w-5 text-primary" />Upload / replace image</>}
      <Input ref={inputRef} disabled={disabled || busy} className={compact ? 'hidden' : 'mt-2 h-auto text-xs'} type="file" accept="image/png,image/jpeg,image/webp" aria-describedby={helpId} onChange={(event) => {
        const next = event.target.files?.[0]; event.target.value = '';
        if (!next) return;
        setError('');
        if (next.size > 10 * 1024 * 1024 || !/\.(png|jpe?g|webp)$/i.test(next.name)) { setError('Choose a PNG, JPEG or WebP file up to 10 MB.'); return; }
        setImage(null); setCrop({ ratio: 16 / 9, zoom: 1, x: 50, y: 50 }); setFile(next);
      }} />
    </label>
    <p id={helpId} className="text-[11px] text-muted-foreground">{compact ? 'PNG, JPG or WebP · up to 10 MB' : 'Crop and resize before upload. Images stay private until you publish their page.'}</p>
    {error && !file && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <Dialog open={Boolean(file)} onOpenChange={(open) => { if (!open) close(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Crop your image</DialogTitle><DialogDescription>Choose the frame and position. Your original file stays unchanged.</DialogDescription></DialogHeader>
      <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-xl border bg-muted p-2"><canvas ref={canvas} aria-label="Cropped image preview" className="max-h-64 max-w-full object-contain" />{!image && <p role="status" className="text-sm">Opening image…</p>}</div>
      <fieldset disabled={busy || !image} className="space-y-4">
        <label className="block space-y-1 text-sm">Frame<select className="w-full rounded-md border bg-background p-2" value={crop.ratio} onChange={(e) => setCrop((value) => ({ ...value, ratio: Number(e.target.value) }))}><option value={16 / 9}>Banner · 16:9</option><option value={3}>Wide banner · 3:1</option><option value={1}>Square · 1:1</option><option value={4 / 5}>Portrait · 4:5</option><option value={0}>Original proportions</option></select></label>
        {range('Zoom', 'zoom', 1, 3, 0.1)}{range('Horizontal position', 'x', 0, 100)}{range('Vertical position', 'y', 0, 100)}
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={close}>{busy ? 'Cancel upload' : 'Cancel'}</Button><Button disabled={busy || !image} onClick={async () => {
        if (!image || !canvas.current || busy) return;
        const controller = new AbortController(); pending.current = controller;
        setBusy(true); setError('');
        try {
          let encoded = '';
          for (const maxSide of [1600, 1200, 900]) {
            drawImageCrop(canvas.current, image, crop, maxSide);
            encoded = canvas.current.toDataURL('image/jpeg', 0.88).split(',')[1];
            if (encoded.length * 3 / 4 <= 2 * 1024 * 1024) break;
          }
          if (encoded.length * 3 / 4 > 2 * 1024 * 1024) throw new Error('The cropped image is still too large. Choose a smaller crop.');
          const asset = await uploadUIImage(file!.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Image', 'image/jpeg', encoded, controller.signal);
          if (controller.signal.aborted) return;
          onUploaded(asset); close();
        } catch (e) { if (!controller.signal.aborted) setError(uiError(e)); }
        finally { if (!controller.signal.aborted) setBusy(false); }
      }}>{busy ? 'Uploading…' : 'Use this crop'}</Button></div>
    </DialogContent></Dialog>
  </div>;
}
