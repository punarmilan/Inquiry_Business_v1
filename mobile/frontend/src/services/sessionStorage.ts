import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { TokenPair } from './api';

const SESSION_STORAGE_KEY = 'inquiryexperts_session_v1';
const LEGACY_STORAGE_KEY = 'kaamsaathi_tokens';

let writeQueue: Promise<void> = Promise.resolve();

const enqueueWrite = (operation: () => Promise<void>) => {
  writeQueue = writeQueue.then(operation, operation);
  return writeQueue;
};

const setSecureValue = (value: string) =>
  Platform.OS === 'web'
    ? AsyncStorage.setItem(SESSION_STORAGE_KEY, value)
    : SecureStore.setItemAsync(SESSION_STORAGE_KEY, value);

const getSecureValue = () =>
  Platform.OS === 'web'
    ? AsyncStorage.getItem(SESSION_STORAGE_KEY)
    : SecureStore.getItemAsync(SESSION_STORAGE_KEY);

const deleteSecureValue = () =>
  Platform.OS === 'web'
    ? AsyncStorage.removeItem(SESSION_STORAGE_KEY)
    : SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);

export const saveSessionTokens = (tokens: TokenPair) =>
  enqueueWrite(async () => {
    await setSecureValue(JSON.stringify(tokens));
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  });

export const clearSessionTokens = () =>
  enqueueWrite(async () => {
    await Promise.all([deleteSecureValue(), AsyncStorage.removeItem(LEGACY_STORAGE_KEY)]);
  });

export const loadSessionTokens = async (): Promise<TokenPair | null> => {
  await writeQueue;
  const stored = await getSecureValue();
  if (stored) return JSON.parse(stored) as TokenPair;

  // One-time migration for users upgrading from the AsyncStorage implementation.
  const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return null;
  const parsed = JSON.parse(legacy) as TokenPair;
  await saveSessionTokens(parsed);
  return parsed;
};
