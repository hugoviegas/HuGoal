import { getLocales } from "expo-localization";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "@/lib/firebase";

interface NutritionAudioFormat {
  extension: string;
  mimeType: string;
}

export interface NutritionAudioTranscriptionResult {
  text: string;
  storagePath?: string;
  downloadUrl?: string;
  localUri?: string;
  durationMs: number;
  mimeType?: string;
}

type RecognitionSession = {
  transcript: string;
  audioUri: string | null;
  resultPromise: Promise<{ text: string; localUri: string | null }>;
  resolve: (value: { text: string; localUri: string | null }) => void;
  reject: (reason?: unknown) => void;
  cleanup: () => void;
};

let activeRecognitionSession: RecognitionSession | null = null;
let recordingStartedAt = 0;
let loadedSpeechRecognitionModule: ExpoSpeechRecognitionModuleType | null = null;

type ExpoSpeechRecognitionModuleType = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: (eventName: string, listener: (...args: unknown[]) => void) => {
    remove: () => void;
  };
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
};

let speechRecognitionModulePromise:
  | Promise<ExpoSpeechRecognitionModuleType | null>
  | null = null;

async function loadSpeechRecognitionModule(): Promise<ExpoSpeechRecognitionModuleType | null> {
  if (!speechRecognitionModulePromise) {
    speechRecognitionModulePromise = import("expo-speech-recognition")
      .then((module) => {
        const resolved = module as unknown as {
          ExpoSpeechRecognitionModule?: ExpoSpeechRecognitionModuleType;
        };

        loadedSpeechRecognitionModule = resolved.ExpoSpeechRecognitionModule ?? null;
        return loadedSpeechRecognitionModule;
      })
      .catch(() => null);
  }

  return speechRecognitionModulePromise;
}

function getRecognitionLocale(): string {
  const locales = getLocales();
  const primary = locales[0]?.languageTag?.trim();
  if (primary) {
    return primary;
  }

  return "pt-BR";
}

function toDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function detectAudioFormat(uri: string): NutritionAudioFormat {
  const lower = uri.toLowerCase();

  if (lower.endsWith(".wav")) {
    return { extension: "wav", mimeType: "audio/wav" };
  }

  if (lower.endsWith(".mp3")) {
    return { extension: "mp3", mimeType: "audio/mpeg" };
  }

  if (lower.endsWith(".aac")) {
    return { extension: "aac", mimeType: "audio/aac" };
  }

  if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) {
    return { extension: "m4a", mimeType: "audio/mp4" };
  }

  return { extension: "m4a", mimeType: "audio/mp4" };
}

async function uploadAudioTemp(
  uid: string,
  localUri: string,
  format: NutritionAudioFormat,
): Promise<{ storagePath: string; downloadUrl: string }> {
  const now = new Date();
  const dateKey = toDateKey(now);
  const storagePath = `users/${uid}/nutrition/audio/${dateKey}/${Date.now()}.${format.extension}`;

  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error("Unable to read recorded audio file for upload");
  }

  const blob = await response.blob();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, blob, {
    contentType: format.mimeType,
    customMetadata: {
      uploadedAt: now.toISOString(),
      expiresAt,
      temporary: "true",
      dateKey,
    },
  });

  const downloadUrl = await getDownloadURL(fileRef);
  return { storagePath, downloadUrl };
}

export function isNutritionAudioRecordingActive(): boolean {
  return activeRecognitionSession !== null;
}

export async function startNutritionAudioRecording(): Promise<void> {
  if (activeRecognitionSession) {
    return;
  }

  const ExpoSpeechRecognitionModule = await loadSpeechRecognitionModule();
  if (!ExpoSpeechRecognitionModule) {
    throw new Error(
      "Speech recognition is unavailable in this build. Use text or image input.",
    );
  }

  if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
    throw new Error("Speech recognition is not available on this device");
  }

  const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Speech recognition permission denied");
  }

  recordingStartedAt = Date.now();

  let resolvePromise!: (value: { text: string; localUri: string | null }) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const resultPromise = new Promise<{ text: string; localUri: string | null }>(
    (resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    },
  );

  const session: RecognitionSession = {
    transcript: "",
    audioUri: null,
    resultPromise,
    resolve: resolvePromise,
    reject: rejectPromise,
    cleanup: () => {
      resultSub.remove();
      errorSub.remove();
      endSub.remove();
      audioEndSub.remove();

      if (activeRecognitionSession === session) {
        activeRecognitionSession = null;
      }
    },
  };

  const resultSub = ExpoSpeechRecognitionModule.addListener("result", (event) => {
    const castEvent = event as {
      results?: Array<{ transcript?: string }>;
    };
    const transcript = castEvent.results?.[0]?.transcript?.trim() ?? "";
    if (transcript) {
      session.transcript = transcript;
    }
  });

  const errorSub = ExpoSpeechRecognitionModule.addListener("error", (ev) => {
    session.cleanup();
    const errorEvent = ev as { message?: string };
    session.reject(new Error(errorEvent.message || "Speech recognition failed"));
  });

  const audioEndSub = ExpoSpeechRecognitionModule.addListener(
    "audioend",
    (event) => {
      const audioEvent = event as { uri?: string };
      session.audioUri = audioEvent.uri ?? null;
    },
  );

  const endSub = ExpoSpeechRecognitionModule.addListener("end", () => {
    const text = session.transcript.trim();
    if (!text) {
      session.cleanup();
      session.reject(new Error("No speech detected. Try speaking closer to the mic."));
      return;
    }

    session.cleanup();
    session.resolve({ text, localUri: session.audioUri });
  });

  activeRecognitionSession = session;

  try {
    ExpoSpeechRecognitionModule.start({
      lang: getRecognitionLocale(),
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: true,
      addsPunctuation: true,
      recordingOptions: {
        persist: true,
      },
    });
    await Promise.resolve();
  } catch (error) {
    if (activeRecognitionSession) {
      activeRecognitionSession.cleanup();
    }
    throw error;
  }

  // Promise is consumed by stopNutritionAudioRecordingAndTranscribe.
}

export async function cancelNutritionAudioRecording(): Promise<void> {
  if (!activeRecognitionSession) {
    return;
  }

  const ExpoSpeechRecognitionModule = loadedSpeechRecognitionModule;
  if (!ExpoSpeechRecognitionModule) {
    activeRecognitionSession.cleanup();
    recordingStartedAt = 0;
    return;
  }

  try {
    ExpoSpeechRecognitionModule.abort();
  } catch {
    // Best-effort cancellation
  } finally {
    activeRecognitionSession.cleanup();
    recordingStartedAt = 0;
  }
}

export async function stopNutritionAudioRecordingAndTranscribe(
  uid: string,
): Promise<NutritionAudioTranscriptionResult> {
  if (!activeRecognitionSession) {
    throw new Error("No active recording to stop");
  }

  const ExpoSpeechRecognitionModule = loadedSpeechRecognitionModule;
  if (!ExpoSpeechRecognitionModule) {
    activeRecognitionSession.cleanup();
    recordingStartedAt = 0;
    throw new Error(
      "Speech recognition is unavailable in this build. Use text or image input.",
    );
  }

  const session = activeRecognitionSession;

  try {
    ExpoSpeechRecognitionModule.stop();

    const result = await Promise.race([
      session.resultPromise,
      new Promise<{ text: string; localUri: string | null }>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Speech recognition timed out"));
        }, 10000);
      }),
    ]);

    const transcript = result.text.trim();
    if (!transcript) {
      throw new Error("Could not transcribe audio message");
    }

    const localUri = result.localUri ?? undefined;
    let storagePath: string | undefined;
    let downloadUrl: string | undefined;
    let mimeType: string | undefined;

    if (localUri) {
      const format = detectAudioFormat(localUri);
      mimeType = format.mimeType;

      try {
        const upload = await uploadAudioTemp(uid, localUri, format);
        storagePath = upload.storagePath;
        downloadUrl = upload.downloadUrl;
      } catch {
        // Upload is optional for local transcription.
      }
    }

    return {
      text: transcript,
      storagePath,
      downloadUrl,
      localUri,
      durationMs: Math.max(0, Date.now() - recordingStartedAt),
      mimeType,
    };
  } finally {
    recordingStartedAt = 0;
  }
}

