import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildWorkoutCoverPath(uid: string, fileName: string): string {
  const safeName = sanitizeFileName(fileName) || "cover-image.jpg";
  return `workout-covers/${uid}/${Date.now()}-${safeName}`;
}

export async function uploadWorkoutCoverImage(params: {
  uid: string;
  uri: string;
  fileName?: string;
  contentType?: string;
}): Promise<{ storagePath: string; downloadUrl: string }> {
  const storagePath = buildWorkoutCoverPath(
    params.uid,
    params.fileName ?? "cover-image.jpg",
  );

  const response = await fetch(params.uri);
  const blob = await response.blob();

  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, blob, {
    contentType: params.contentType ?? blob.type ?? "image/jpeg",
  });

  return {
    storagePath,
    downloadUrl: await getDownloadURL(fileRef),
  };
}
