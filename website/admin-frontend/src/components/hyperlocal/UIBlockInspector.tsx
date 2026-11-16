import { Input } from '@/components/ui/input';
import type { UIBlock, UIPageKey, UILocalizedText, UIAssetMetadata } from '../../../../../mobile/frontend/src/types/dynamicUI';
import { UI_ACTIONS } from '@/utils/uiConfigSchema';
import { Button } from '@/components/ui/button';
import { UIImageUpload } from './UIImageUpload';
import { UIHomeCardControls } from './UIHomeCardControls';
import { UIHomeDestination } from './UIHomeDestination';
import { UIImagePreview, UIEditorIcon } from './UIVisualAssets';
import { uiVisual } from '../../../../../mobile/frontend/src/utils/uiVisual';
import type { UIAnimationAsset } from '@/api/ui';
import type { UIBlockStyle } from '../../../../../mobile/frontend/src/types/dynamicUI';

export function UIBlockInspector({ block, assets, onChange, onRegisterAsset, pageKey = 'offersHome', occupiedHomePlacements = [], fixedHomePlacement = false, simpleHome = false }: { pageKey?: UIPageKey; block: UIBlock; assets: Record<string, UIAssetMetadata>; onChange: (block: UIBlock) => void; onRegisterAsset?: (asset: UIAnimationAsset) => void; occupiedHomePlacements?: string[]; fixedHomePlacement?: boolean; simpleHome?: boolean }) {
  const patch = (values: Record<string, unknown>) => {
    const props: Record<string, unknown> = { ...block.props, ...values };
    for (const key of Object.keys(props)) if (props[key] === undefined) delete props[key];
    onChange({ ...block, props } as UIBlock);
  };
  const copy = (label: string, key: string, value?: UILocalizedText, required = false, withHindi = true) => <div className="space-y-2">
    <label className="block text-sm">{label} (English)<Input maxLength={500} value={value?.en || ''} onChange={(e) => patch({ [key]: !required && !e.target.value ? undefined : { ...value, en: e.target.value } })} /></label>
    {withHindi && <label className="block text-sm text-muted-foreground">{label} (Hindi, optional)<Input maxLength={500} value={value?.hi || ''} onChange={(e) => { const next = { en: value?.en || '', ...(e.target.value ? { hi: e.target.value } : {}) }; patch({ [key]: next }); }} /></label>}
  </div>;
  const select = (label: string, value: string, choices: readonly string[], change: (value: string) => void) => <label className="block space-y-2 text-sm">{label}<select className="block w-full rounded-md border bg-background p-2" value={value} onChange={(e) => change(e.target.value)}>{choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}</select></label>;
  const number = (label: string, key: string, value: number, min: number, max: number, step = 1) => <label className="block space-y-2 text-sm">{label}<Input type="number" min={min} max={max} step={step} value={value} onChange={(e) => { const n = e.target.valueAsNumber; if (Number.isFinite(n) && n >= min && n <= max) patch({ [key]: n }); }} /></label>;
  const format = (values: Partial<UIBlockStyle>) => onChange({ ...block, style: { ...block.style, ...values } });
  const range = (label: string, field: keyof UIBlockStyle, value: number, min: number, max: number, unit = 'px') => <label className="block space-y-1 text-xs"><span className="flex justify-between font-medium">{label}<span className="tabular-nums text-muted-foreground">{value}{unit}</span></span><Input type="range" className="h-6 border-0 p-0 accent-primary" min={min} max={max} value={value} onChange={(e) => format({ [field]: Number(e.target.value) })} /></label>;
  const images = Object.values(assets).filter((asset) => asset.kind === 'image');
  const imageId = block.type === 'image' ? block.props.assetId : block.type === 'heroBanner' ? block.props.imageAssetId : undefined;
  if (simpleHome && block.type === 'homeCard') {
    const hasCopy = block.props.placement !== 'offer' && block.props.placement !== 'trending';
    const hindiFields: Array<[string, string, UILocalizedText | undefined]> = [
      ['Title', 'title', block.props.title],
      ...(hasCopy ? [['Subtitle', 'subtitle', block.props.subtitle], ['Button label', 'buttonLabel', block.props.buttonLabel]] as Array<[string, string, UILocalizedText | undefined]> : []),
    ];
    return <div className="space-y-4">
      {copy(block.props.placement === 'offer' ? 'Artwork description' : 'Title', 'title', block.props.title, true, false)}
      {hasCopy && <>{copy('Description', 'subtitle', block.props.subtitle, false, false)}{copy('Button text', 'buttonLabel', block.props.buttonLabel, false, false)}</>}
      {hasCopy && <UIHomeDestination card={block} patch={patch} />}
      <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={!block.hidden} onChange={e => onChange({ ...block, hidden: !e.target.checked })} />Show in app</label>
      {hasCopy && <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={block.props.showCopy !== false} onChange={e => patch({ showCopy: e.target.checked })} />Show text on the card</label>}
      {hasCopy && block.props.showCopy === false && <p className="text-xs text-muted-foreground">Your text is hidden. Enable “Show text on the card” to display it.</p>}
      <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Hindi text</summary><div className="mt-3 space-y-3">{hindiFields.map(([label, key, value]) => <label key={key} className="block space-y-1 text-sm">{label} (Hindi, optional)<Input maxLength={500} value={value?.hi || ''} onChange={e => patch({ [key]: { en: value?.en || '', ...(e.target.value ? { hi: e.target.value } : {}) } })} /></label>)}</div></details>
      <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Image library & animation</summary><div className="mt-3 space-y-4"><UIHomeCardControls key={block.id} card={block} assets={assets} patch={patch} register={onRegisterAsset} occupied={occupiedHomePlacements} fixedPlacement />
        {block.props.media === 'lottie' && <>{number('Animation speed', 'speed', block.props.speed || 1, 0.25, 2, 0.25)}{number('Animation plays', 'loopCount', block.props.loopCount || 3, 1, 3)}</>}
      </div></details>
      <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">More settings</summary><div className="mt-3 space-y-4">
        {block.props.placement === 'promo' && <>{copy('Compact caption', 'compactSubtitle', block.props.compactSubtitle)}{copy('Badge', 'badge', block.props.badge)}</>}
        {(block.props.placement === 'aboveTrending' || block.props.placement === 'belowTrending') && number('Minimum banner height', 'height', block.props.height || 100, 80, 240)}
        {block.props.placement === 'trending' && number('Offer limit', 'limit', block.props.limit || 40, 1, 40)}
        {select('Image fit', block.props.fit || 'cover', ['cover', 'contain'], fit => patch({ fit }))}
        {hasCopy && <>{range('Rounded corners', 'borderRadius', block.style?.borderRadius ?? 20, 0, 32)}<div className="grid grid-cols-2 gap-3"><label className="text-xs">Text color<Input type="color" value={block.style?.color || '#08152F'} onChange={e => format({ color: e.target.value })} /></label><label className="text-xs">Background<Input type="color" value={block.style?.backgroundColor || '#FFFFFF'} onChange={e => format({ backgroundColor: e.target.value })} /></label></div></>}
      </div></details>
    </div>;
  }
  return <div className="space-y-5">
    <h2 className="text-sm font-semibold">Content</h2><p className="text-xs text-muted-foreground">Customize this {block.type.replace(/([A-Z])/g, ' $1').toLowerCase()}.</p>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!block.hidden} onChange={(e) => onChange({ ...block, hidden: !e.target.checked })} />Visible in app</label>
    {block.type === 'homeCard' && <>
      <UIHomeCardControls key={block.id} card={block} assets={assets} patch={patch} register={onRegisterAsset} occupied={occupiedHomePlacements} fixedPlacement={fixedHomePlacement} />
      {copy(block.props.placement === 'offer' ? 'Artwork description' : 'Title', 'title', block.props.title, true)}
      {block.props.placement !== 'offer' && block.props.placement !== 'trending' && copy('Subtitle', 'subtitle', block.props.subtitle)}
      {block.props.placement === 'promo' && <>{copy('Compact caption', 'compactSubtitle', block.props.compactSubtitle)}{copy('Badge', 'badge', block.props.badge)}</>}
      {block.props.placement !== 'offer' && block.props.placement !== 'trending' && <>
        {copy('Button label', 'buttonLabel', block.props.buttonLabel)}
        <UIHomeDestination card={block} patch={patch} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={block.props.showCopy !== false} onChange={e => patch({ showCopy: e.target.checked })} />Show editable text over artwork</label>
      </>}
      {(block.props.placement === 'aboveTrending' || block.props.placement === 'belowTrending') && number('Minimum banner height', 'height', block.props.height || 100, 80, 240)}
      {block.props.placement === 'trending' && number('Offer limit', 'limit', block.props.limit || 40, 1, 40)}
      {block.props.media === 'lottie' && <>{number('Animation speed', 'speed', block.props.speed || 1, 0.25, 2, 0.25)}{number('Animation plays', 'loopCount', block.props.loopCount || 3, 1, 3)}</>}
      {select('Image fit', block.props.fit || 'cover', ['cover', 'contain'], fit => patch({ fit }))}
      {block.props.placement !== 'offer' && block.props.placement !== 'trending' && <>{range('Rounded corners', 'borderRadius', block.style?.borderRadius ?? 20, 0, 32)}
        <div className="grid grid-cols-2 gap-3"><label className="text-xs">Text color<Input type="color" value={block.style?.color || '#08152F'} onChange={e => format({ color: e.target.value })} /></label><label className="text-xs">Background<Input type="color" value={block.style?.backgroundColor || '#FFFFFF'} onChange={e => format({ backgroundColor: e.target.value })} /></label></div></>}
    </>}
    {(block.type === 'image' || block.type === 'heroBanner') && <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
      <h3 className="text-xs font-semibold">{block.type === 'heroBanner' ? 'Banner photo' : 'Image'}</h3>
      {imageId && <UIImagePreview assetId={imageId} alt="Selected image" height={100} />}
      <label className="block space-y-1 text-xs">Image library<select className="w-full rounded-md border bg-background p-2 text-xs" value={imageId || ''} onChange={(e) => patch(block.type === 'image' ? { assetId: e.target.value } : { imageAssetId: e.target.value || undefined })}><option value="">{block.type === 'image' ? 'Choose an image' : 'No photo'}</option>{images.map((image, index) => <option key={image.id} value={image.id}>Image {index + 1} · {image.width} × {image.height}</option>)}</select></label>
      {images.length > 1 && <div className="grid grid-cols-3 gap-1.5">{images.slice(0, 6).map((image, index) => <button type="button" key={image.id} aria-label={`Use image ${index + 1}`} aria-pressed={imageId === image.id} className={`cursor-pointer overflow-hidden rounded-lg border-2 focus-visible:ring-2 focus-visible:ring-ring ${imageId === image.id ? 'border-primary' : 'border-transparent hover:border-primary/40'}`} onClick={() => patch(block.type === 'image' ? { assetId: image.id } : { imageAssetId: image.id })}><UIImagePreview assetId={image.id} alt={`Image ${index + 1}`} height={52} /></button>)}</div>}
      <UIImageUpload onUploaded={(asset) => { onRegisterAsset?.(asset); patch(block.type === 'image' ? { assetId: asset._id } : { imageAssetId: asset._id }); }} />
      {block.type === 'heroBanner' && imageId && number('Photo height', 'imageHeight', block.props.imageHeight || 160, 80, 320)}
    </div>}
    {block.type === 'image' && <>{copy('Image description', 'alt', block.props.alt, true)}{number('Image height', 'height', block.props.height || 180, 64, 480)}{select('Image fit', block.props.fit || 'cover', ['cover', 'contain'], (fit) => patch({ fit }))}</>}
    {block.type === 'icon' && <><h3 className="text-sm font-semibold">Choose an icon</h3><div className="grid grid-cols-4 gap-1.5">{uiVisual.icons.map((name) => <button type="button" key={name} title={name} aria-label={`Use ${name} icon`} aria-pressed={block.props.name === name} className={`flex cursor-pointer items-center justify-center rounded-lg border p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${block.props.name === name ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`} onClick={() => patch({ name })}><UIEditorIcon name={name} size={22} /></button>)}</div>{number('Icon size', 'size', block.props.size || 40, 16, 96)}{copy('Icon caption', 'label', block.props.label)}</>}
    {block.type === 'text' && <>{copy('Text', 'text', block.props.text, true)}{select('Typography', block.props.variant || 'body', ['heading', 'body', 'caption'], (variant) => patch({ variant }))}</>}
    {block.type === 'illustration' && <>{select('Bundled image', block.props.image, ['welcome', 'offers', 'services', 'business'], (image) => patch({ image }))}{copy('Image description', 'alt', block.props.alt, true)}{number('Image height', 'height', block.props.height || 160, 96, 240)}{select('Image fit', block.props.fit || 'contain', ['contain', 'cover'], (fit) => patch({ fit }))}</>}
    {block.type === 'heroBanner' && <>{copy('Title', 'title', block.props.title, true)}{copy('Subtitle', 'subtitle', block.props.subtitle)}{pageKey === 'offersHome' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!block.props.action} onChange={(e) => patch({ action: e.target.checked ? 'offers.openAll' : undefined, buttonLabel: e.target.checked ? { en: 'View offers' } : undefined })} />Show action button</label>}{block.props.action && <>{copy('Button label', 'buttonLabel', block.props.buttonLabel, true)}{select('Action', block.props.action, UI_ACTIONS, (action) => patch({ action }))}</>}</>}
    {(block.type === 'text' || block.type === 'heroBanner' || block.type === 'icon') && <>{select('Theme text color', block.props.colorToken || 'text', ['text', 'textSecondary'], (colorToken) => patch({ colorToken }))}{select('Theme background', block.props.backgroundToken || 'surface', ['background', 'surface', 'primary', 'primaryDark', 'accent'], (backgroundToken) => patch({ backgroundToken }))}</>}
    {block.type === 'actionLink' && <>{copy('Label', 'label', block.props.label, true)}{select('Action', block.props.action, UI_ACTIONS, (action) => patch({ action }))}</>}
    {block.type === 'offerRail' && <>{select('Existing data source', block.props.source, ['nearby', 'showcase'], (source) => patch({ source }))}{select('Card variant', block.props.variant || 'standard', ['standard', 'compact'], (variant) => patch({ variant }))}{number('Offer limit', 'limit', block.props.limit || 12, 1, 12)}<p className="text-xs text-muted-foreground">Uses the current city and eligible offers. Home Showcase remains managed by its existing editor.</p></>}
    {block.type === 'spacer' && number('Height', 'height', block.props.height, 0, 48)}
    {block.type === 'lottie' && <>{select('Animation asset', block.props.assetId, Object.keys(assets).filter((id) => assets[id].kind !== 'image'), (assetId) => patch({ assetId }))}{copy('Static fallback', 'fallback', block.props.fallback, true)}{number('Speed', 'speed', block.props.speed || 1, 0.25, 2, 0.25)}{number('Width', 'width', block.props.width || 160, 32, 320)}{number('Height', 'height', block.props.height || 120, 32, 320)}{number('Plays (enable loop below for 2–3)', 'loopCount', block.props.loopCount || 1, 1, 3)}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={block.props.loop || false} onChange={(e) => patch({ loop: e.target.checked })} />Loop within play limit</label>{select('Alignment', block.props.alignment || 'center', ['left', 'center', 'right'], (alignment) => patch({ alignment }))}</>}
    {block.type !== 'homeCard' && <details open className="space-y-3 border-t pt-3"><summary className="cursor-pointer text-sm font-semibold">Layout and appearance</summary><div className="space-y-4 pt-3">
      {range('Width', 'widthPercent', block.style?.widthPercent ?? 100, 25, 100, '%')}
      {select('Section alignment', block.style?.alignment || 'left', ['left', 'center', 'right'], (alignment) => format({ alignment: alignment as UIBlockStyle['alignment'] }))}
      {range('Padding', 'padding', block.style?.padding ?? (block.type === 'heroBanner' ? 20 : block.type === 'text' ? 16 : 0), 0, 32)}
      {range('Space below', 'marginBottom', block.style?.marginBottom ?? 0, 0, 32)}
      {range('Rounded corners', 'borderRadius', block.style?.borderRadius ?? (block.type === 'heroBanner' ? 16 : 0), 0, 32)}
      {(block.type === 'text' || block.type === 'heroBanner' || block.type === 'icon') && <>
        {range('Text size', 'fontSize', block.style?.fontSize ?? (block.type === 'heroBanner' || (block.type === 'text' && block.props.variant === 'heading') ? 24 : 16), 10, 40)}
        {select('Font family', block.style?.fontFamily || 'default', ['default', 'serif', 'monospace'], (fontFamily) => format({ fontFamily: fontFamily as UIBlockStyle['fontFamily'] }))}
        {select('Text alignment', block.style?.textAlign || 'left', ['left', 'center', 'right'], (textAlign) => format({ textAlign: textAlign as UIBlockStyle['textAlign'] }))}
        {select('Text weight', block.style?.fontWeight || 'normal', ['normal', '600', '700'], (fontWeight) => format({ fontWeight: fontWeight as UIBlockStyle['fontWeight'] }))}
        <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-xs">Text color<Input type="color" className="h-9 cursor-pointer p-1" value={block.style?.color || '#172033'} onChange={(e) => format({ color: e.target.value })} /></label><label className="space-y-1 text-xs">Background<Input type="color" className="h-9 cursor-pointer p-1" value={block.style?.backgroundColor || '#FFFFFF'} onChange={(e) => format({ backgroundColor: e.target.value })} /></label></div>
        <p className="text-[11px] text-muted-foreground">Save checks readability in both light and dark mode.</p>
      </>}
      <Button variant="outline" size="sm" onClick={() => { const next = { ...block }; delete next.style; onChange(next); }}>Reset formatting</Button>
    </div></details>}
  </div>;
}
