import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadString,
} from "firebase/storage";
import type { ImagePickerAsset } from "expo-image-picker";
import { storage } from "@/lib/firebase";
import * as FileSystem from "expo-file-system";

const WORKOUT_IMAGE_PATH = "workout-covers";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

export interface WorkoutMediaUploadResult {
  imageUrl: string;
  storagePath: string;
}

/**
 * Upload a workout cover image to Firebase Storage.
 * Returns the download URL and storage path reference.
 *
 * Note: This function expects the image to be read as base64 from the URI
 * before being passed to this function or uses fetch to download from the URI.
 */
export async function uploadWorkoutCoverImage(
  uid: string,
  workoutId: string,
  imageAsset: ImagePickerAsset,
): Promise<WorkoutMediaUploadResult> {
  if (!imageAsset.uri) {
    throw new Error("Image URI is missing");
  }

  // Determine file extension from asset URI or mime type
  let extension = "jpg";
  if (imageAsset.uri.includes(".png")) {
    extension = "png";
  } else if (imageAsset.uri.includes(".webp")) {
    extension = "webp";
  }

  // Create a unique filename using timestamp
  const timestamp = Date.now();
  const filename = `${workoutId}_${timestamp}.${extension}`;
  const storagePath = `${WORKOUT_IMAGE_PATH}/${uid}/${filename}`;

  try {
    // First attempt: use fetch -> blob -> uploadBytes (works on web)
    try {
      const response = await fetch(imageAsset.uri);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`,
        );
      }

      const blob = await response.blob();

      // Validate blob size when available
      if (typeof blob.size === "number" && blob.size > MAX_IMAGE_SIZE) {
        throw new Error(
          `Image size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit (actual: ${(blob.size / 1024 / 1024).toFixed(2)}MB)`,
        );
      }

      // Upload to Firebase Storage (use initialized `storage` to ensure correct bucket)
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, blob);

      // Get the download URL
      const imageUrl = await getDownloadURL(fileRef);

      return {
        imageUrl,
        storagePath,
      };
    } catch (err) {
      // If the blob path fails (common on some Android URIs), fallback to reading file as base64
      console.warn("[uploadWorkoutCoverImage] blob upload failed, falling back to base64 upload", err);

      try {
        // Read file as base64 using Expo FileSystem (supports file:// and content:// URIs on Android)
        const base64 = await FileSystem.readAsStringAsync(imageAsset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const fileRef = ref(storage, storagePath);
        // uploadString accepts a base64 string when specifying the 'base64' format
        await uploadString(fileRef, base64, "base64", {
          contentType: `image/${extension}`,
        });

        const imageUrl = await getDownloadURL(fileRef);
        return { imageUrl, storagePath };
      } catch (fallbackError) {
        console.error("[uploadWorkoutCoverImage] base64 fallback upload failed", {
          uid,
          workoutId,
          storagePath,
          error: fallbackError,
        });
        throw fallbackError;
      }
    }
  } catch (error) {
    console.error("[uploadWorkoutCoverImage] Upload failed", {
      uid,
      workoutId,
      storagePath,
      error,
    });
    throw error;
  }
}

/**
 * Delete a workout cover image from Firebase Storage.
 */
export async function deleteWorkoutCoverImage(
  storagePath: string,
): Promise<void> {
  try {
    const fileRef = ref(storage, storagePath);
    // Attempt to delete the object; if it fails, log and continue
    await deleteObject(fileRef);
    console.log(`[deleteWorkoutCoverImage] Deleted: ${storagePath}`);
  } catch (error) {
    console.error("[deleteWorkoutCoverImage] Delete failed", {
      storagePath,
      error,
    });
    // Don't throw; deletion failures are non-blocking
  }
}
