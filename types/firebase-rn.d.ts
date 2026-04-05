/**
 * Module augmentation for Firebase Auth React Native persistence.
 *
 * `getReactNativePersistence` is exported from the React Native bundle of
 * `@firebase/auth` and `firebase/auth`, but is not included in the public
 * TypeScript types for this workspace setup.
 *
 * This declaration makes the function available to TypeScript without
 * breaking any other types.
 */
import type AsyncStorage from "@react-native-async-storage/async-storage";
import type { Persistence } from "@firebase/auth";

declare module "@firebase/auth" {
  export function getReactNativePersistence(
    storage: typeof AsyncStorage,
  ): Persistence;
}

declare module "firebase/auth" {
  export function getReactNativePersistence(
    storage: typeof AsyncStorage,
  ): Persistence;
}
