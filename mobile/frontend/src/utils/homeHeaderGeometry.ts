import type { UIHomeHeader } from '../types/dynamicUI';

/** Shared by the native header and the admin's responsive full-header preview. */
export function homeHeaderGeometry(width: number, settings: UIHomeHeader, count: number) {
  const viewport = Math.max(1, width - 28);
  const height = Math.round(Math.max(180, width * 0.48) * ({ small: 0.85, medium: 1, large: 1.15 }[settings.height]));
  const gap = 6;
  const cardWidth = settings.style === 'heroShortcuts' ? viewport * 0.92 : count <= 1 ? viewport : viewport * (settings.style === 'photoCarousel' ? 0.62 : 0.74);
  const stride = cardWidth + gap;
  return { viewport, height, cardWidth, gap, stride, origin: count > 1 ? (viewport - cardWidth) / 2 - stride : (viewport - cardWidth) / 2 };
}
