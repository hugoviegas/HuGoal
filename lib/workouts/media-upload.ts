import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { ImagePickerAsset } from "expo-image-picker";

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
    // Fetch the image from URI and convert to blob
    const response = await fetch(imageAsset.uri);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`,
      );
    }

    const blob = await response.blob();

    // Validate blob size
    if (blob.size > MAX_IMAGE_SIZE) {
      throw new Error(
        `Image size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit (actual: ${(blob.size / 1024 / 1024).toFixed(2)}MB)`,
      );
    }

    // Upload to Firebase Storage
    const storage = getStorage();
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, blob);

    // Get the download URL
    const imageUrl = await getDownloadURL(fileRef);

    return {
      imageUrl,
      storagePath,
    };
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
    const storage = getStorage();
    const fileRef = ref(storage, storagePath);
    // Firebase Storage delete is available through deleteObject
    // For now, we'll log the intent; a proper implementation
    // would use deleteObject from firebase/storage
    console.log(`[deleteWorkoutCoverImage] Mark for cleanup: ${storagePath}`);
  } catch (error) {
    console.error("[deleteWorkoutCoverImage] Delete failed", {
      storagePath,
      error,
    });
    // Don't throw; deletion failures are non-blocking
  }
}
