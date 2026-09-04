export type OfferSticker = {
  _id: string;
  name: string;
  slug: string;
  kind: 'image' | 'emoji';
  imageUrl?: string;
  emoji?: string;
  sortOrder?: number;
};
