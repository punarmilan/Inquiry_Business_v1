import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHomeShowcase } from '@/api/hyperlocal';
import { uploadUIAsset, uiError, type UIAnimationAsset } from '@/api/ui';
import { UIImageUpload } from './UIImageUpload';
import { UIImagePreview } from './UIVisualAssets';
import { UIAnimationPreview } from './UIAnimationPreview';
import { parseUIAnimation } from '../../../../../mobile/frontend/src/utils/uiAnimation';
import { UI_ANIMATION_MAX_BYTES } from '../../../../../mobile/frontend/src/utils/uiAnimationLimits';
import { homePlacementLabel } from '../../../../../mobile/frontend/src/utils/uiHome';
import type { UIHomeCard, UIAssetMetadata } from '../../../../../mobile/frontend/src/types/dynamicUI';

export function UIHomeCardControls({ card, assets, patch, register, occupied = [], fixedPlacement = false }: { card: UIHomeCard; assets: Record<string, UIAssetMetadata>; patch: (values: Record<string, unknown>) => void; register?: (asset: UIAnimationAsset) => void; occupied?: string[]; fixedPlacement?: boolean }) {
  const [offers, setOffers] = useState<Array<{ _id: string; title: string }>>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const p = card.props;
  useEffect(() => {
    let active = true;
    void getHomeShowcase().then(result => { if (active) setOffers(result.selectedOffers || []); }).catch(() => { if (active) setError('Could not load selected offers. Reopen this card to retry.'); });
    return () => { active = false; };
  }, []);
  const upload = async (file: File) => {
    setError(''); setUploading(true);
    try {
      if (file.size > UI_ANIMATION_MAX_BYTES) throw new Error('Choose a Lottie JSON file under 10 MB.');
      let parsed: unknown;
      try { parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); }
      catch { throw new Error('Choose a valid Lottie JSON file.'); }
      const animation = parseUIAnimation(parsed);
      const asset = await uploadUIAsset(file.name.replace(/\.json$/i, ''), animation);
      register?.(asset); patch({ media: 'lottie', assetId: asset._id });
    } catch (e) { setError(uiError(e)); } finally { setUploading(false); }
  };
  return <div className="space-y-4 rounded-xl border bg-muted/20 p-3">
    {!fixedPlacement && <label className="block space-y-1 text-sm">Home placement<select className="w-full rounded-md border bg-background p-2" value={p.placement} onChange={e => {
      const placement = e.target.value;
      patch({ placement, offerId: placement === 'offer' ? offers[0]?._id || '' : undefined,
        ...(placement === 'trending' || placement === 'offer' ? { media: 'none', assetId: undefined } : {}) });
    }}>{Object.entries(homePlacementLabel).map(([key, label]) => <option key={key} value={key} disabled={['aboveTrending', 'belowTrending', 'trending'].includes(key) && occupied.includes(key)}>{label}</option>)}</select></label>}
    {p.placement === 'offer' && <label className="block space-y-1 text-sm">Selected showcase offer<select className="w-full rounded-md border bg-background p-2" value={p.offerId || ''} onChange={e => patch({ offerId: e.target.value })}><option value="">Choose an offer</option>{offers.map(offer => <option key={offer._id} value={offer._id}>{offer.title}</option>)}</select></label>}
    {(p.placement === 'offer' || p.placement === 'trending') && <p className="text-xs text-muted-foreground">Offer names, prices and availability come from your existing offers. <Link className="text-primary underline" to="/home-showcase" target="_blank" rel="noreferrer">Choose trending offers (new tab)</Link>. An individual artwork selection overrides the section artwork.</p>}
    <label className="block space-y-1 text-sm">Card / banner media<select className="w-full rounded-md border bg-background p-2" value={p.media} onChange={e => {
      const media = e.target.value;
      const asset = Object.values(assets).find(asset => media === 'image' ? asset.kind === 'image' : asset.kind !== 'image');
      patch({ media, assetId: media === 'image' || media === 'lottie' ? asset?.id || '' : undefined });
    }}><option value="bundled">App artwork</option><option value="image">Uploaded image</option><option value="lottie">Lottie animation</option><option value="none">No custom artwork</option></select></label>
    <label className="block space-y-1 text-xs">Static fallback artwork<select className="w-full rounded-md border bg-background p-2" value={p.bundled} onChange={e => patch({ bundled: e.target.value })}>{['offers', 'post', 'events', 'services', 'support', 'moreDeals'].map(key => <option key={key}>{key}</option>)}</select></label>
    {(p.media === 'image' || p.media === 'lottie') && <label className="block space-y-1 text-sm">{p.media === 'image' ? 'Image library' : 'Animation library'}<select className="w-full rounded-md border bg-background p-2" value={p.assetId || ''} onChange={e => patch({ assetId: e.target.value })}><option value="">Choose or upload media</option>{Object.values(assets).filter(asset => p.media === 'image' ? asset.kind === 'image' : asset.kind !== 'image').map((asset, index) => <option key={asset.id} value={asset.id}>{p.media === 'image' ? 'Image' : 'Animation'} {index + 1} · {asset.width} × {asset.height}</option>)}</select></label>}
    {p.media === 'image' && <>{p.assetId && <UIImagePreview assetId={p.assetId} height={110} alt={p.title.en} />}<UIImageUpload onUploaded={asset => { register?.(asset); patch({ media: 'image', assetId: asset._id }); }} /></>}
    {p.media === 'lottie' && <>{p.assetId && <UIAnimationPreview assetId={p.assetId} speed={p.speed || 1} loop loopCount={p.loopCount || 3} />}<label className="block space-y-2 text-xs">Upload Lottie JSON<input className="block w-full" type="file" accept="application/json,.json" disabled={uploading} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void upload(file); }} /></label><p className="text-xs text-muted-foreground">{uploading ? 'Uploading animation…' : 'Up to 10 MB. Static fallback appears with reduced motion or if animation cannot load.'}</p></>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
