import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { UIHomeHeader } from '../../../../../mobile/frontend/src/types/dynamicUI';
import { headerPreset, HOME_HEADER_PRESETS } from '../../../../../mobile/frontend/src/utils/uiHomeHeader';
import artwork from '../../../../../mobile/frontend/assets/reference-home/local-offers.png';

function StyleThumbnail({ style }: { style: UIHomeHeader['style'] }) {
  const tile = 'rounded-lg border-2 border-white';
  const photo = { backgroundImage: `url(${artwork})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  return <div aria-hidden="true" className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-muted/60 p-2">
    {style === 'heroShortcuts' ? <div className="w-full space-y-1"><div className={`${tile} h-12 w-full bg-teal-100`} style={photo} /><div className="grid grid-cols-4 gap-1">{['bg-teal-100', 'bg-sky-100', 'bg-violet-100', 'bg-orange-100'].map(fill => <span key={fill} className={`${tile} h-5 ${fill}`} />)}</div></div>
      : style === 'splitCarousel' ? <div className="flex w-full items-center gap-1"><span className={`${tile} h-12 w-4 shrink-0 bg-violet-100`} /><div className={`${tile} flex h-16 flex-1 overflow-hidden bg-orange-50`}><span className="w-1/2" style={photo} /><span className="flex flex-1 flex-col justify-center gap-1 px-1"><span className="h-1.5 rounded bg-teal-800" /><span className="h-1 w-3/4 rounded bg-teal-700/40" /><span className="mt-1 h-2 rounded bg-teal-700" /></span></div><span className={`${tile} h-12 w-4 shrink-0 bg-violet-100`} /></div>
      : style === 'photoCarousel' ? <div className="flex w-full items-center justify-center gap-1"><span className={`${tile} h-14 w-6 shrink-0 bg-orange-100`} /><div className={`${tile} h-20 w-2/3`} style={photo} /><span className={`${tile} h-14 w-6 shrink-0 bg-violet-100`} /></div>
      : <div className="flex w-full items-center gap-1"><div className={`${tile} h-20 w-[44%]`} style={photo} />{['bg-sky-100', 'bg-violet-100', 'bg-orange-100'].map(fill => <span key={fill} className={`${tile} h-16 flex-1 ${fill}`} />)}</div>}
  </div>;
}

export function UIHomeHeaderControls({ settings, disabled, onChange }: { settings: UIHomeHeader; disabled: boolean; onChange: (value: UIHomeHeader) => void }) {
  const patch = (values: Partial<UIHomeHeader>) => onChange({ ...settings, ...values });
  return <fieldset disabled={disabled} className="space-y-3 rounded-2xl border bg-card p-4">
    <legend className="px-1 text-sm font-semibold">Header card style</legend>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{HOME_HEADER_PRESETS.map(preset => <button key={preset.id} type="button" aria-label={`Use ${preset.name}`} aria-pressed={settings.style === preset.id} onClick={() => onChange(headerPreset(preset.id, settings))}
      className={cn('min-w-0 rounded-xl border-2 p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent', settings.style === preset.id ? 'border-primary bg-accent' : 'border-transparent bg-muted/30 hover:border-primary/40')}>
      <StyleThumbnail style={preset.id} /><span className="mt-2 block text-xs font-semibold">{preset.name}{preset.id === 'accordion' ? ' · Default' : ''}</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{preset.description}</span>
    </button>)}</div>
    <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Slide settings</summary><div className="mt-3 grid gap-4 sm:grid-cols-2">
      <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={settings.autoPlay} onChange={e => patch({ autoPlay: e.target.checked })} />Auto-slide</label>
      <label className="space-y-1 text-sm">Seconds between cards<Input type="number" min={3} max={10} step={1} disabled={!settings.autoPlay} value={settings.intervalSeconds} onChange={e => { const value = e.target.valueAsNumber; if (Number.isInteger(value) && value >= 3 && value <= 10) patch({ intervalSeconds: value }); }} /></label>
      <label className="space-y-1 text-sm">Slide animation<select className="h-10 w-full rounded-lg border bg-background px-3" value={settings.transition} onChange={e => patch({ transition: e.target.value as UIHomeHeader['transition'] })}>{settings.style === 'accordion' ? <option value="expand">Expand & slide</option> : <><option value="slide">Slide</option><option value="fade">Fade</option></>}</select></label>
      <label className="space-y-1 text-sm">Header card height<select className="h-10 w-full rounded-lg border bg-background px-3" value={settings.height} onChange={e => patch({ height: e.target.value as UIHomeHeader['height'] })}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
      <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={settings.showArrows} onChange={e => patch({ showArrows: e.target.checked })} />Show arrows</label>
      <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={settings.showDots} onChange={e => patch({ showDots: e.target.checked })} />Show dots</label>
    </div><p className="mt-3 text-xs text-muted-foreground">Animations finish their configured plays before auto-slide. The app pauses automatic motion when it is in the background or reduced motion is enabled.</p></details>
  </fieldset>;
}
