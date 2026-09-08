import type { ImageSourcePropType } from 'react-native';

// Visible PNG bounds (including a little room for soft edges). Layout uses these
// instead of the transparent canvas; the original images are never cropped.
export type OnboardingAsset = {
  source: ImageSourcePropType;
  bounds: readonly [number, number, number, number];
};

export const SCREEN_1 = {
  background: require('../../../assets/screen-1/ChatGPT Image Sep 7, 2026, 12_05_40 PM.png'),
  woman: { source: require('../../../assets/screen-1/02-woman.png'), bounds: [0, 55, 1086, 1393] },
  food: { source: require('../../../assets/screen-1/03-food-drinks-card.png'), bounds: [71, 258, 1310, 599] },
  plumber: { source: require('../../../assets/screen-1/04-plumber-card.png'), bounds: [214, 267, 1020, 604] },
  cleaning: { source: require('../../../assets/screen-1/05-home-cleaning-card.png'), bounds: [51, 173, 1346, 850] },
  restaurant: { source: require('../../../assets/screen-1/06-restaurant-card.png'), bounds: [361, 127, 710, 874] },
  explore: { source: require('../../../assets/screen-1/07-explore-nearby.png'), bounds: [409, 88, 1355, 560] },
} satisfies { background: ImageSourcePropType } & Record<string, ImageSourcePropType | OnboardingAsset>;

export const SCREEN_2 = {
  background: require('../../../assets/screen-2/ChatGPT Image Sep 7, 2026, 12_08_51 PM.png'),
  people: { source: require('../../../assets/screen-2/02-people.png'), bounds: [0, 161, 1122, 1187] },
  profile: { source: require('../../../assets/screen-2/03-alis-plumbing-card.png'), bounds: [100, 317, 1262, 489] },
  verified: { source: require('../../../assets/screen-2/04-verified-professionals.png'), bounds: [232, 240, 789, 823] },
  prices: { source: require('../../../assets/screen-2/05-honest-prices.png'), bounds: [279, 245, 695, 806] },
  nearby: { source: require('../../../assets/screen-2/06-nearby-deals.png'), bounds: [211, 208, 831, 870] },
} satisfies { background: ImageSourcePropType } & Record<string, ImageSourcePropType | OnboardingAsset>;

export const SCREEN_3 = {
  background: require('../../../assets/screen-3/ChatGPT Image Sep 7, 2026, 12_02_38 PM.png'),
  findServices: { source: require('../../../assets/screen-3/04-find-services-card.png'), bounds: [116, 142, 890, 1153] },
  postOffer: { source: require('../../../assets/screen-3/05-post-your-offer-card.png'), bounds: [112, 144, 900, 1143] },
} satisfies { background: ImageSourcePropType } & Record<string, ImageSourcePropType | OnboardingAsset>;
