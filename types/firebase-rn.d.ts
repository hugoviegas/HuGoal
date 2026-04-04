/**
 * Module augmentation for Firebase Auth React Native persistence.
 *
 * `getReactNativePersistence` is exported from the React Native bundle of
 * `@firebase/auth` (resolved by Metro via the "react-native" field in
 * package.json) but is NOT included in the TypeScript public types.
 *
 * This declaration makes the function available to TypeScript without
 * breaking any other types.
 */
import type AsyncStorage from '@react-native-async-storage/async-storage';
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function getReactNativePersistence(storage: typeof AsyncStorage | any): Persistence;
}
