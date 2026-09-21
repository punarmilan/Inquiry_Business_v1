import * as ImagePicker from 'expo-image-picker';

export type PickedPoster = { dataUrl: string; width: number; height: number };

export type PosterPick = { poster: PickedPoster } | { error: string };

// The offers API accepts up to 7,000,000 characters per image data URL (about 5 MB of image).
const MAX_DATA_URL_LENGTH = 6_900_000;
const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

/** Opens the photo library and returns the chosen poster as an API-ready data URL, or null when cancelled. */
export const pickPosterImage = async (): Promise<PosterPick | null> => {
  try {
    // The system photo picker needs no permission request.
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8, base64: true });
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset) return null;
    if (!asset.base64) return { error: 'The image could not be read. Please choose another one.' };
    const mimeType = asset.mimeType?.toLowerCase();
    const dataUrl = `data:${mimeType && SUPPORTED_MIME_TYPES.includes(mimeType) ? mimeType : 'image/jpeg'};base64,${asset.base64}`;
    if (dataUrl.length > MAX_DATA_URL_LENGTH) return { error: 'This image is too large. Please choose a poster under 5 MB.' };
    return { poster: { dataUrl, width: asset.width, height: asset.height } };
  } catch {
    return { error: 'The image could not be opened. Please try again.' };
  }
};
