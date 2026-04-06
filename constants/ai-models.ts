export interface GeminiModelLimit {
  label: string;
  modelId: string;
  modelCandidates?: string[];
  rpm: number;
  tpm: string;
  rpd: string;
  vision: boolean;
}

export const GEMINI_MODEL_LIMITS: GeminiModelLimit[] = [
  {
    label: "Gemini 3.1 Flash Lite",
    modelId: "gemini-3.1-flash-lite",
    modelCandidates: [
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash-lite-latest",
    ],
    rpm: 15,
    tpm: "250K",
    rpd: "500/day",
    vision: true,
  },
  {
    label: "Gemini 2.5 Flash",
    modelId: "gemini-2.5-flash",
    modelCandidates: ["gemini-2.5-flash", "gemini-2.5-flash-latest"],
    rpm: 5,
    tpm: "250K",
    rpd: "20/day",
    vision: true,
  },
  {
    label: "Gemini 2.5 Flash Lite",
    modelId: "gemini-2.5-flash-lite",
    modelCandidates: ["gemini-2.5-flash-lite", "gemini-2.5-flash-lite-latest"],
    rpm: 10,
    tpm: "250K",
    rpd: "20/day",
    vision: true,
  },
  {
    label: "Gemini 3 Flash",
    modelId: "gemini-3-flash",
    modelCandidates: [
      "gemini-3-flash",
      "gemini-2.5-flash",
      "gemini-2.5-flash-latest",
    ],
    rpm: 5,
    tpm: "250K",
    rpd: "20/day",
    vision: true,
  },
  {
    label: "Gemma 4 26B/31B",
    modelId: "gemma-4-27b-it",
    modelCandidates: ["gemma-4-27b-it"],
    rpm: 15,
    tpm: "unlimited",
    rpd: "1500/day",
    vision: false,
  },
];

const PREFERRED_VISION_CHAIN_LABELS = [
  "Gemini 3.1 Flash Lite",
  "Gemini 2.5 Flash Lite",
  "Gemini 2.5 Flash",
];

export function getPreferredGeminiVisionChain(): GeminiModelLimit[] {
  const selected: GeminiModelLimit[] = [];

  for (const label of PREFERRED_VISION_CHAIN_LABELS) {
    const model = GEMINI_MODEL_LIMITS.find(
      (item) => item.label === label && item.vision,
    );
    if (model) selected.push(model);
  }

  return selected;
}

export function getRecommendedVisionModel(): GeminiModelLimit {
  const visionModels = GEMINI_MODEL_LIMITS.filter((model) => model.vision);
  return (
    visionModels.sort((a, b) => b.rpm - a.rpm)[0] ?? GEMINI_MODEL_LIMITS[0]
  );
}
