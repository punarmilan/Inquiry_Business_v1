const small = import.meta.glob<string>('../../assets/optimized/pose-*-640.webp', { eager: true, import: 'default' });
const large = import.meta.glob<string>('../../assets/optimized/pose-*-1024.webp', { eager: true, import: 'default' });

// Same poses, in the same order, that the live site cycles through (sources: public/hero-motion, optimised by scripts/optimize-assets.mjs).
const names = [
  'dreamy_woman_in_teal_hoodie_with_smartphone',
  'smiling_woman_in_teal_hoodie_with_phone',
  'smiling_woman_with_smartphone_cutout',
  'smiling_woman_with_smartphone_in_teal_hoodie',
  'teal_hoodie_smartphone_portrait',
  'woman_in_teal_hoodie_with_smartphone',
  'woman_using_smartphone_in_teal_hoodie',
  'young_woman_holding_smartphone_in_teal_hoodie',
];

export const heroPoses = names.map(name => {
  const compact = small[`../../assets/optimized/pose-${name}-640.webp`];
  const full = large[`../../assets/optimized/pose-${name}-1024.webp`];
  return { src: full, srcSet: `${compact} 640w, ${full} 1024w` };
});

// The live site's poster pose; it is shown first, under reduced motion, and until every pose has decoded.
export const POSTER_POSE = 2;

// Rendered portrait widths per layout, mirrored from the portrait heights in AnimatedHero.css.
export const POSE_SIZES = '(max-width: 639px) min(36vh, 314px), (max-width: 959px) min(38vh, 374px), min(62vh, 654px)';
