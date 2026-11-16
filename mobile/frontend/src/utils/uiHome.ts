import type { UIHomeCard, UIPage, UILocalizedText, UILocale } from '../types/dynamicUI';

export const homeCopy = (value: UILocalizedText | undefined, locale: UILocale, fallback = '') => value?.[locale] || value?.en || fallback;
export const homeCards = (page: UIPage): UIHomeCard[] => [...page.slots.beforeContent, ...page.slots.afterContent].filter((block): block is UIHomeCard => block.type === 'homeCard');
export const homePlacementLabel = { promo: 'Header carousel card', aboveTrending: 'Banner above trending', belowTrending: 'Banner below offers', trending: 'Trending section', offer: 'Individual offer artwork' };
const isUploadedPromotion = (card: UIHomeCard) => card.props.placement === 'promo' && card.props.media === 'image' && Boolean(card.props.assetId);
export const homeCardShowsCopy = (card: UIHomeCard) => !isUploadedPromotion(card) && card.props.showCopy !== false;
export const homeCardMediaFit = (card: UIHomeCard) => isUploadedPromotion(card) ? 'contain' : card.props.fit || 'cover';
export function defaultHomeCards(): UIHomeCard[] {
  const card = (id: string, props: UIHomeCard['props'], backgroundColor: string): UIHomeCard => ({ id, type: 'homeCard', props, style: { color: '#08152F', backgroundColor, borderRadius: 20 } });
  return [
    card('home_offers', { placement: 'promo', compactSubtitle: { en: 'Deals near\nyou', hi: 'पास के\nऑफ़र' }, badge: { en: 'Special Deals', hi: 'खास ऑफ़र' }, title: { en: 'Local Offers', hi: 'लोकल ऑफ़र' }, subtitle: { en: 'Save more. Shop local.\nExclusive deals near you.', hi: 'लोकल खरीदें, ज़्यादा बचाएँ।' }, buttonLabel: { en: 'Explore', hi: 'देखें' }, homeAction: 'offers', media: 'bundled', bundled: 'offers' }, '#D3F2E1'),
    card('home_post', { placement: 'promo', title: { en: 'Create Post', hi: 'पोस्ट करें' }, subtitle: { en: 'Share, Sell,\nAsk & More', hi: 'शेयर करें, बेचें, पूछें' }, homeAction: 'post', media: 'bundled', bundled: 'post' }, '#DCEFFF'),
    card('home_events', { placement: 'promo', title: { en: 'Local Events', hi: 'लोकल इवेंट' }, subtitle: { en: 'Happenings\naround you', hi: 'आस-पास के आयोजन' }, homeAction: 'events', media: 'bundled', bundled: 'events' }, '#EFE3FF'),
    card('home_services', { placement: 'promo', title: { en: 'Find Services', hi: 'सर्विस खोजें' }, subtitle: { en: 'Trusted local\nprofessionals', hi: 'भरोसेमंद लोकल पेशेवर' }, homeAction: 'services', media: 'bundled', bundled: 'services' }, '#FFE9D9'),
    card('home_support', { placement: 'aboveTrending', title: { en: 'Support Local Business', hi: 'लोकल व्यवसाय का साथ दें' }, subtitle: { en: 'Shop local. Support local.', hi: 'लोकल खरीदें, साथ आगे बढ़ें।' }, buttonLabel: { en: 'Explore Now', hi: 'अभी देखें' }, homeAction: 'offers', media: 'bundled', bundled: 'support', height: 100, showCopy: false }, '#DCF0F5'),
    card('home_more', { placement: 'belowTrending', title: { en: 'More local. More savings.', hi: 'लोकल खरीदें, ज़्यादा बचाएँ।' }, subtitle: { en: 'Explore offers from shops around you.', hi: 'आस-पास की दुकानों के ऑफ़र देखें।' }, buttonLabel: { en: 'Explore', hi: 'देखें' }, homeAction: 'offers', media: 'bundled', bundled: 'moreDeals', height: 100 }, '#FFE7D5'),
    card('home_trending', { placement: 'trending', title: { en: 'Trending Near You', hi: 'आपके आस-पास लोकप्रिय' }, media: 'none', bundled: 'offers', limit: 40 }, '#FFFFFF'),
  ];
}
