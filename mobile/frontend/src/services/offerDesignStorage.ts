import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OfferCardDesign, OfferCardTemplate } from '../config/offerCardDesigner';

export type OfferDesignHistoryItem = {
  templateId: string;
  name: string;
  category?: string;
  previewUrl?: string;
  source?: 'admin' | 'system' | 'custom';
  lastUsedAt: string;
};

export type OfferDesignCreation = {
  id: string;
  name: string;
  category?: string;
  templateId: string;
  previewUrl?: string;
  design: OfferCardDesign;
  title?: string;
  description?: string;
  imageUrls?: string[];
  updatedAt: string;
};

type LibraryState = {
  history: OfferDesignHistoryItem[];
  creations: OfferDesignCreation[];
};

const MAX_ITEMS = 30;
const keyFor = (userId: string) => `offer-design-library:v1:${userId}`;

const emptyState = (): LibraryState => ({ history: [], creations: [] });

export const readOfferDesignLibrary = async (userId?: string | null): Promise<LibraryState> => {
  if (!userId) return emptyState();
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<LibraryState>;
    return {
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, MAX_ITEMS) : [],
      creations: Array.isArray(parsed.creations) ? parsed.creations.slice(0, MAX_ITEMS) : [],
    };
  } catch {
    return emptyState();
  }
};

const write = async (userId: string, state: LibraryState) => {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify({
    history: state.history.slice(0, MAX_ITEMS),
    creations: state.creations.slice(0, MAX_ITEMS),
  }));
};

export const recordOfferTemplateUsage = async (userId: string | null | undefined, template: OfferCardTemplate) => {
  if (!userId) return;
  const current = await readOfferDesignLibrary(userId);
  const next: OfferDesignHistoryItem = {
    templateId: template.id,
    name: template.name,
    category: template.category,
    previewUrl: template.previewUrl,
    source: template.source,
    lastUsedAt: new Date().toISOString(),
  };
  const history = [next, ...current.history.filter((item) => item.templateId !== template.id)];
  await write(userId, { ...current, history });
};

export const saveOfferDesignCreation = async (userId: string | null | undefined, creation: OfferDesignCreation) => {
  if (!userId) return;
  const current = await readOfferDesignLibrary(userId);
  const creations = [creation, ...current.creations.filter((item) => item.id !== creation.id)];
  await write(userId, { ...current, creations });
};
