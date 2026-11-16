import type { UIBlock, UIPage, UITheme, UISlot } from '../../../../../mobile/frontend/src/types/dynamicUI';
import { palettes } from '@/utils/uiConfigSchema';
import { UIAnimationPreview } from './UIAnimationPreview';
import { UIHomeCardPreview } from './UIHomeCardPreview';
import { parseUIBlock } from '../../../../../mobile/frontend/src/utils/dynamicUI';
import { uiIllustrations } from '@/utils/uiIllustrations';
import { UIImagePreview, UIEditorIcon } from './UIVisualAssets';
import { visualWebText as visualText } from '../../../../../mobile/frontend/src/utils/uiVisual';

export function UIPhonePreview({ theme, page, mode, selectedId, onSelect, onMove, deviceWidth = 375 }: { theme: UITheme; page: UIPage; mode: 'light' | 'dark'; selectedId?: string; onSelect?: (id: string) => void; onMove?: (id: string, slot: UISlot, targetId?: string) => void; deviceWidth?: number }) {
  const c = { ...palettes[mode], ...theme.modes[mode].colors };
  const p = page.presentation || {};
  const option = (field: string) => typeof p[field] === 'string' ? p[field] : 'default';
  const copy = (field: string, fallback: string) => typeof p[field] === 'object' ? p[field].en : fallback;
  const heading = page.key.replace(/([A-Z])/g, ' $1');
  const card = { border: `1px solid ${option('cardVariant') === 'outlined' ? c.primary : c.border}`, background: option('cardVariant') === 'soft' ? c.background : c.surface, borderRadius: 16, padding: 12 };
  const sample = (title: string, text: string) => <div style={card}><strong className="text-sm">{title}</strong><p className="mt-2 text-xs" style={{ color: c.textSecondary }}>{text}</p></div>;
  const menus = <div className="space-y-3" style={card}>{['Saved locations', 'Saved offers', 'Account settings', 'Help', 'Logout'].map((label) => <p key={label} className="border-b py-2 text-sm" style={{ borderColor: c.border, marginBlock: option('menuVariant') === 'separated' ? 12 : 0 }}>{label} <span className="float-right">›</span></p>)}</div>;
  const native = (() => {
    switch (page.key) {
      case 'servicesHome': return <>{sample('Choose city / locality', 'Protected location selector and area search')}{sample('Your neighbourhood', 'Available service areas · sample data')}{sample('Another area', 'Area card · sample data')}</>;
      case 'serviceCategories': return <>{sample('Search services', 'Native search and emergency contacts remain available')}<div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${option('categoryLayout') === 'twoColumns' ? 2 : option('categoryLayout') === 'threeColumns' ? 3 : 1}, minmax(0, 1fr))` }}>{['Plumbing', 'Electrician', 'Cleaning'].map((label) => <div key={label} style={card} className="text-sm">{label}</div>)}</div><p className="text-xs">Empty: {copy('emptyMessage', 'No services match your search.')}</p></>;
      case 'serviceProviders': return <>{sample('Search providers', 'Filters use the selected city, category and locality')}<div style={{ ...card, padding: option('providerVariant') === 'compact' ? 8 : 16 }}><strong>Sample provider</strong><p className="my-2 text-xs">Verified status comes from the provider API.</p><p className="text-sm">Call · WhatsApp · Share</p></div><p className="text-xs">Empty: {copy('emptyMessage', 'No provider found.')}</p></>;
      case 'offerDetails': return <><div style={{ ...card, padding: option('posterVariant') === 'contained' ? 20 : 8 }}>{sample('Offer poster', 'Existing poster artwork and eligibility')}</div>{sample('Business profile', 'API verification status and trusted store action')}<div style={card} className={option('detailsVariant') === 'stacked' ? 'space-y-3' : 'flex flex-wrap gap-4'}><span>₹299 · sample price</span><span>Grab offer</span></div>{sample('Validity, terms and location', 'Actual details remain owned by the offer API')}<p className="text-sm">Call · WhatsApp · Directions · Save · Share</p></>;
      case 'businessCenter': return <div className={option('dashboardVariant') === 'compact' ? 'space-y-2' : 'space-y-5'}>{sample('Business dashboard', 'Native register / view profile / resubmit actions')}{sample('Sample business', 'Approval and plan status remain server controlled')}{sample('Quick actions', 'Choose plan · My offers · Register business')}</div>;
      case 'plans': return <>{copy('promotionalLabel', '') && <p className="text-sm font-semibold">{copy('promotionalLabel', '')}</p>}<div style={{ ...card, padding: option('planLayout') === 'compact' ? 8 : 20 }}><strong>Sample plan</strong><p className="my-3 text-xl">₹499 / month</p><p className="text-xs">Sample data. Price, quotas and eligibility come from the plans API.</p><p className="mt-3 text-sm">Choose plan · server verified payment</p></div></>;
      case 'onboarding': return <><img loading="lazy" src={uiIllustrations[String(option('welcomeArtwork'))] || uiIllustrations.welcome} alt="Bundled onboarding illustration" className="h-36 w-full object-contain" />{sample(copy('welcomeTitle', 'Welcome to InquiryExperts'), copy('welcomeSubtitle', 'Discover local offers and services.'))}<p className="text-sm">Native slide navigation · Next · Skip · Language</p></>;
      case 'login': case 'otp': case 'profileSetup': return <>{page.key === 'login' && option('backgroundArtwork') !== 'default' ? <img loading="lazy" src={uiIllustrations[String(option('backgroundArtwork'))]} alt="Selected background" className="h-24 w-full object-cover" /> : null}{sample(page.key === 'otp' ? 'Verify OTP' : page.key === 'profileSetup' ? 'Create account' : 'Sign in', 'Native fields, validation and server responses are protected')}<div style={card} className="space-y-4">{(page.key === 'otp' ? ['OTP input', 'Resend', 'Verify'] : ['Phone / email', 'Password / Google', 'Terms and privacy', 'Continue']).map((label) => <div className="rounded-md border p-3 text-xs" style={{ borderColor: c.border }} key={label}>{label} · Native</div>)}</div></>;
      case 'more': return <>{sample('Business Center', 'Trusted destination and server-gated business menu')}{menus}</>;
      case 'profile': return <>{sample('Your profile', 'Avatar, name and verification from the account API')}{menus}</>;
      default: return null;
    }
  })();
  const offers = <div className="flex gap-3 overflow-hidden py-3">{['Neighbourhood café', 'Local fashion'].map((title) => <div key={title} className="min-w-40 rounded-xl border p-3" style={{ background: c.surface, borderColor: c.border }}><div className="mb-3 h-14 rounded-md" style={{ background: c.primaryDark }} /><strong className="text-sm">{title}</strong><p className="text-xs" style={{ color: c.textSecondary }}>Sample offer · Nearby</p></div>)}</div>;
  const blockContent = (item: UIBlock) => {
    if (item.hidden && !onSelect) return null;
    if (!parseUIBlock(item, page.key)) return <p key={item.id} className="text-xs">Complete this section's required properties to preview it.</p>;
    switch (item.type) {
      case 'homeCard': return <UIHomeCardPreview card={item} />;
      case 'spacer': return <div key={item.id} style={{ height: item.props.height }} />;
      case 'text': return <div key={item.id} className="p-4" style={{ background: item.style?.backgroundColor || c[item.props.backgroundToken || 'surface'], color: item.style?.color || c[item.props.colorToken || 'text'], fontSize: item.props.variant === 'heading' ? 24 : item.props.variant === 'caption' ? 12 : 16, padding: item.style?.padding !== undefined ? 0 : undefined, ...visualText(item.style) }}>{item.props.text.en}</div>;
      case 'heroBanner': return <div key={item.id} className="space-y-2 rounded-2xl border p-5" style={{ background: item.style?.backgroundColor || c[item.props.backgroundToken || 'surface'], color: item.style?.color || c[item.props.colorToken || 'text'], borderColor: c.border, padding: item.style?.padding !== undefined ? 0 : undefined, borderRadius: item.style?.borderRadius }}>
        {item.props.imageAssetId && <UIImagePreview assetId={item.props.imageAssetId} height={item.props.imageHeight || 160} alt={item.props.title.en} />}
        <h3 className="text-xl font-bold" style={visualText(item.style)}>{item.props.title.en}</h3><p style={{ textAlign: item.style?.textAlign }}>{item.props.subtitle?.en}</p>{item.props.buttonLabel && <span className="inline-block rounded-xl px-4 py-2 text-sm" style={{ background: c.primary, color: c.textInverse }}>{item.props.buttonLabel.en}</span>}</div>;
      case 'image': return <UIImagePreview key={item.id} assetId={item.props.assetId} alt={item.props.alt.en} height={item.props.height || 180} fit={item.props.fit} />;
      case 'icon': return <div key={item.id} className="flex flex-col gap-2 p-3" style={{ padding: item.style?.padding !== undefined ? 0 : undefined, alignItems: (item.style?.textAlign || item.style?.alignment || 'center') === 'left' ? 'flex-start' : (item.style?.textAlign || item.style?.alignment) === 'right' ? 'flex-end' : 'center', color: item.style?.color || c[item.props.colorToken || 'text'], background: item.style?.backgroundColor || c[item.props.backgroundToken || 'surface'] }}><UIEditorIcon name={item.props.name} size={item.props.size || 40} />{item.props.label && <p style={visualText(item.style)}>{item.props.label.en}</p>}</div>;
      case 'offerRail': return <div key={item.id}><p className="text-xs" style={{ color: c.textSecondary }}>{item.props.source === 'showcase' ? 'Home Showcase offers' : 'Nearby offers'} · sample data</p>{offers}</div>;
      case 'actionLink': return <div key={item.id} className="rounded-xl border px-4 py-3 text-center" style={{ color: c.primary, borderColor: c.primary }}>{item.props.label.en}</div>;
      case 'lottie': return <div key={item.id} style={{ width: item.props.width || 160, maxWidth: '100%', marginInline: item.props.alignment === 'center' ? 'auto' : undefined }}><UIAnimationPreview assetId={item.props.assetId} speed={item.props.speed} loop={item.props.loop} loopCount={item.props.loopCount} /><p className="text-xs">Fallback: {item.props.fallback.en}</p></div>;
      case 'illustration': return <img loading="lazy" key={item.id} src={uiIllustrations[item.props.image]} alt={item.props.alt.en} style={{ width: '100%', height: item.props.height || 160, objectFit: item.props.fit || 'contain' }} />;
      default: return null;
    }
  };
  const block = (item: UIBlock, slot: UISlot) => {
    if (item.hidden && !onSelect) return null;
    const s = item.style;
    return <div key={item.id} data-canvas-block={item.id} className={`group relative min-h-4 ${onSelect ? 'my-2 rounded-lg outline outline-2 outline-offset-4 transition-shadow' : ''} ${onSelect && selectedId === item.id ? 'outline-primary shadow-sm' : onSelect ? 'outline-transparent hover:outline-primary/40' : ''}`} style={{ width: `${s?.widthPercent || 100}%`, marginLeft: s?.alignment === 'center' || s?.alignment === 'right' ? 'auto' : undefined, marginRight: s?.alignment === 'center' ? 'auto' : undefined, marginBottom: s?.marginBottom, padding: s?.padding, borderRadius: s?.borderRadius, background: s?.backgroundColor, opacity: item.hidden ? 0.4 : 1 }}
      onDragOver={(event) => { if (onMove) event.preventDefault(); }} onDrop={(event) => { if (!onMove) return; event.preventDefault(); event.stopPropagation(); const id = event.dataTransfer.getData('text/plain'); if (id) onMove(id, slot, item.id); }}>
      <div inert={Boolean(onSelect)} className="overflow-hidden" style={{ borderRadius: s?.borderRadius }}>{blockContent(item)}</div>
      {onSelect && <button type="button" className="absolute inset-0 z-10 cursor-grab rounded-lg bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing" aria-label={`Edit ${item.type} section${item.hidden ? ' (hidden)' : ''}`} aria-pressed={selectedId === item.id} draggable={Boolean(onMove)} onClick={() => onSelect(item.id)} onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id); onSelect(item.id); }} onKeyDown={(event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault(); const index = page.slots[slot].findIndex((block) => block.id === item.id); const next = page.slots[slot][index + (event.key === 'ArrowUp' ? -1 : 1)]; if (next) onMove?.(item.id, slot, next.id);
        }
      }}><span className={`absolute -top-5 left-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground ${selectedId === item.id ? '' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}>{item.type}{item.hidden ? ' · Hidden' : ''}</span></button>}
    </div>;
  };
  const slot = (key: UISlot) => <div data-canvas-slot={key} className={onSelect ? 'min-h-10 space-y-4 rounded-lg border border-dashed border-transparent p-1' : 'space-y-4'} onDragOver={(event) => { if (onMove) event.preventDefault(); }} onDrop={(event) => { if (!onMove) return; event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (id) onMove(id, key); }}>
    {onSelect && <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider" style={{ color: c.textSecondary }}>{key === 'beforeContent' ? 'Before content' : 'After content'} · drop sections here</p>}
    {page.slots[key].filter(item => item.type !== 'homeCard').map((item) => block(item, key))}
    {onSelect && !page.slots[key].length && <p className="rounded-lg border border-dashed p-4 text-center text-[11px]" style={{ color: c.textSecondary, borderColor: c.border }}>Add a section from the library</p>}
  </div>;
  const homeEntries = (['beforeContent', 'afterContent'] as const).flatMap(slot => page.slots[slot].filter(item => item.type === 'homeCard').map(item => ({ item, slot })));
  const homeRegion = (placement: string) => <div className={placement === 'promo' ? 'flex gap-1 overflow-hidden' : 'space-y-2'}>{homeEntries.filter(({ item }) => item.type === 'homeCard' && item.props.placement === placement).map(({ item, slot }, index) => <div key={item.id} style={placement === 'promo' ? { width: index === 0 ? '44%' : '19%', flexShrink: 0 } : undefined}>{block(item, slot)}</div>)}</div>;
  return <aside className="space-y-3">
    <p className="text-sm font-semibold">{onSelect ? 'Click a section to edit · drag to reorder' : 'Draft mobile preview'}</p>
    <p className="max-w-sm text-xs text-muted-foreground">Preview uses sample offer data. Changes stay in your draft until published.</p>
    <div className="mx-auto w-full overflow-hidden rounded-[32px] border-4 border-slate-700 shadow-xl" style={{ maxWidth: deviceWidth, background: option('backgroundToken') === 'surface' ? c.surface : c.background, color: c.text }}>
      <div className="flex justify-between px-5 py-3 text-xs"><span>9:41</span><span>InquiryExperts</span></div>
      <div className="max-h-[650px] space-y-4 overflow-y-auto p-4" style={{ paddingBlock: option('spacing') === 'compact' ? 8 : option('spacing') === 'comfortable' ? 24 : 16 }}>
        <div style={{ textAlign: option('headerVariant') === 'centered' ? 'center' : 'left', paddingBlock: option('headerVariant') === 'compact' ? 4 : 12 }}><strong>{page.key === 'offersHome' ? 'Discover local offers' : heading}</strong><p className="text-xs" style={{ color: c.textSecondary }}>Protected native screen · Sample data</p></div>
        {slot('beforeContent')}
        {page.key === 'offersHome' ? <>{homeRegion('promo')}<div className="rounded-full border px-4 py-3 text-sm" style={{ background: c.surface, borderColor: c.border, color: c.textSecondary }}>Search offers · Protected</div>
        <div className="flex gap-2 text-xs">{['All', 'Food', 'Shopping'].map((label) => <span className="rounded-full border px-3 py-2" style={{ borderColor: c.border }} key={label}>{label}</span>)}</div>
        {homeEntries.length ? <>{homeRegion('aboveTrending')}{homeRegion('trending')}{offers}{homeRegion('offer')}{homeRegion('belowTrending')}</> : <><div className="rounded-2xl p-5" style={{ background: c.primaryDark, color: '#FFFFFF' }}><strong>Support your local businesses</strong><p className="mt-2 text-xs">Existing Home Showcase banner</p></div><div><strong>Featured and nearby offers</strong>{offers}</div></>}</> : native}
        {slot('afterContent')}
      </div>
      <div className="flex justify-around border-t py-4 text-xs" style={{ borderColor: c.border }}>Offers · Services · More · Profile</div>
    </div>
  </aside>;
}
