import type { UIHomeCard, UIHomeHeader } from '../../../../../mobile/frontend/src/types/dynamicUI';
import { homeCardMediaFit, homeCardShowsCopy } from '../../../../../mobile/frontend/src/utils/uiHome';
import { UIAnimationPreview } from './UIAnimationPreview';
import { UIImagePreview } from './UIVisualAssets';
import offers from '../../../../../mobile/frontend/assets/reference-home/local-offers.png';
import post from '../../../../../mobile/frontend/assets/reference-home/create-post-active.png';
import events from '../../../../../mobile/frontend/assets/reference-home/local-events-active.png';
import services from '../../../../../mobile/frontend/assets/reference-home/find-services-active.png';
import support from '../../../../../mobile/frontend/assets/reference-home/support-local.png';
import moreDeals from '../../../../../mobile/frontend/assets/reference-home/more-local-deals.png';

const artwork = { offers, post, events, services, support, moreDeals };
export function UIHomeCardPreview({ card, template, previewHeight, compact = false, active = true, autoPlay = false, onPlaybackEnd }: { card: UIHomeCard; template?: UIHomeHeader['style']; previewHeight?: number; compact?: boolean; active?: boolean; autoPlay?: boolean; onPlaybackEnd?: (result: 'finished' | 'failed') => void }) {
  const p = card.props;
  if (p.placement === 'trending' && p.media === 'none') return <strong>{p.title.en}</strong>;
  const height = previewHeight ?? (p.placement === 'promo' ? 180 : p.height || 100);
  const showCopy = homeCardShowsCopy(card);
  const photo = template === 'photoCarousel', split = template === 'splitCarousel' && showCopy;
  const fill = card.style?.backgroundColor || '#DCF0F5';
  const mediaStyle = split ? { right: '52%' } : {};
  const fullTemplate = Boolean(template && template !== 'accordion');
  const accordion = template === 'accordion';
  return <div className="relative overflow-hidden" style={{ minHeight: height, height: previewHeight, borderRadius: card.style?.borderRadius ?? 20, color: card.style?.color || '#08152F', background: fill }}>
    {(p.media === 'bundled' || (p.media === 'lottie' && !active)) && <img src={artwork[p.bundled]} alt="" className="absolute inset-0 h-full w-full" style={{ objectFit: p.fit || 'cover', width: split ? '48%' : '100%' }} />}
    {p.media === 'image' && p.assetId && <div className="absolute inset-0" style={mediaStyle}><UIImagePreview assetId={p.assetId} height={height} alt={p.title.en} fit={homeCardMediaFit(card)} /></div>}
    {p.media === 'lottie' && p.assetId && active && <div className="absolute inset-y-0 right-0" style={{ width: split ? '48%' : p.placement === 'promo' ? '100%' : '38%', left: split ? 0 : undefined }}><UIAnimationPreview assetId={p.assetId} speed={p.speed || 1} loop loopCount={p.loopCount || 3} height={p.placement === 'promo' && !fullTemplate ? height * 0.55 : height} controls={false} autoPlay={autoPlay} onPlaybackEnd={onPlaybackEnd} /></div>}
    {showCopy && <div className={fullTemplate ? 'absolute inset-y-0 flex flex-col justify-center gap-1 p-2.5' : accordion ? 'absolute inset-x-0 bottom-2 p-1.5' : p.placement === 'promo' ? 'relative pt-20 p-3' : 'relative p-3'} style={fullTemplate ? { left: split ? '48%' : 0, width: split ? '52%' : photo ? '100%' : '60%', background: photo ? undefined : fill } : p.placement !== 'promo' ? { width: '62%', background: fill } : undefined}>
      {p.badge && !compact && <span className="mb-1 inline-block self-start rounded-full bg-teal-800 px-2 py-1 text-[8px] text-white">{p.badge.en}</span>}
      <strong className="line-clamp-2 block leading-tight" style={{ fontSize: compact ? 11 : fullTemplate ? 21 : accordion ? 19 : 14 }}>{p.title.en}</strong>
      {p.subtitle && <p className="mt-1 line-clamp-2 leading-tight" style={{ fontSize: compact ? 7 : 10 }}>{compact ? p.compactSubtitle?.en || p.subtitle.en : p.subtitle.en}</p>}
      {p.buttonLabel && <span className={`mt-1 inline-block self-start rounded-full bg-teal-800 py-1 text-[9px] text-white ${compact ? 'px-1.5' : 'px-2.5'}`}>{compact ? '→' : `${p.buttonLabel.en} →`}</span>}
    </div>}
  </div>;
}
