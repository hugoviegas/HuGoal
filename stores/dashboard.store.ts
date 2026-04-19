import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  ASYNC_STORAGE_KEY,
  buildDefaultDashboardConfig,
} from "@/constants/dashboard";
import { getDocument, updateDocument } from "@/lib/firestore";
import type {
  DashboardConfig,
  WidgetConfig,
  WidgetSize,
  WidgetType,
} from "@/types/dashboard";
import type { UserProfile } from "@/types";

const DASHBOARD_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

type DashboardCacheSource = "none" | "local" | "remote";

function getUpdatedAtMs(config: DashboardConfig | null): number {
  if (!config?.updatedAt) return 0;
  const parsed = Date.parse(config.updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isConfigStale(config: DashboardConfig | null): boolean {
  if (!config) return true;
  const updatedAtMs = getUpdatedAtMs(config);
  if (updatedAtMs <= 0) return true;
  return Date.now() - updatedAtMs > DASHBOARD_CACHE_MAX_AGE_MS;
}

// ─── Debounced Firestore sync ─────────────────────────────────────────────────
let _syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFirestoreSync(uid: string, config: DashboardConfig): void {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(async () => {
    try {
      await updateDocument("profiles", uid, { dashboard_config: config });
    } catch {
      // Silently fail — AsyncStorage holds the truth, Firestore is best-effort
    }
  }, 1500);
}

async function saveToAsyncStorage(config: DashboardConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Non-critical
  }
}

// ─── Store interface ──────────────────────────────────────────────────────────
interface DashboardState {
  config: DashboardConfig;
  isLoading: boolean;
  isEditMode: boolean;
  cacheSource: DashboardCacheSource;
  isStale: boolean;

  initialize: (uid: string) => Promise<void>;
  enterEditMode: () => void;
  exitEditMode: () => void;
  reorderWidgets: (uid: string, widgets: WidgetConfig[]) => void;
  toggleWidget: (uid: string, type: WidgetType, enabled: boolean) => void;
  resizeWidget: (uid: string, widgetId: string, size: WidgetSize) => void;
  reset: () => void;
}

const defaultConfig = buildDefaultDashboardConfig();

export const useDashboardStore = create<DashboardState>((set, get) => ({
  config: defaultConfig,
  isLoading: true,
  isEditMode: false,
  cacheSource: "none",
  isStale: true,

  initialize: async (uid: string) => {
    set({ isLoading: true, cacheSource: "none" });

    let localConfig: DashboardConfig | null = null;
    let remoteConfig: DashboardConfig | null = null;

    // Step 1: Read AsyncStorage (fast, optimistic)
    try {
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      if (raw) {
        localConfig = JSON.parse(raw) as DashboardConfig;
        set({
          config: localConfig,
          cacheSource: "local",
          isStale: isConfigStale(localConfig),
        });
      }
    } catch {
      // Ignore parse errors
    }

    // Step 2: Read Firestore in background
    try {
      const profile = await getDocument<UserProfile>("profiles", uid);
      if (profile?.dashboard_config) {
        remoteConfig = profile.dashboard_config;
      }
    } catch {
      // Firestore unavailable (offline) — proceed with local
    }

    // Step 3: Reconcile
    let resolvedConfig: DashboardConfig | null = localConfig;
    let resolvedSource: DashboardCacheSource = localConfig ? "local" : "none";

    if (!localConfig && !remoteConfig) {
      // First run — create default and persist to both
      const fresh = buildDefaultDashboardConfig();
      resolvedConfig = fresh;
      resolvedSource = "local";
      set({ config: fresh, cacheSource: resolvedSource, isStale: false });
      await saveToAsyncStorage(fresh);
      scheduleFirestoreSync(uid, fresh);
    } else if (remoteConfig && localConfig) {
      // Both exist — pick newer by updatedAt (ISO string lexicographic comparison is valid for UTC)
      if (remoteConfig.updatedAt > localConfig.updatedAt) {
        resolvedConfig = remoteConfig;
        resolvedSource = "remote";
        set({
          config: remoteConfig,
          cacheSource: resolvedSource,
          isStale: isConfigStale(remoteConfig),
        });
        await saveToAsyncStorage(remoteConfig);
      } else {
        resolvedConfig = localConfig;
        resolvedSource = "local";
      }
      // else: local is newer or equal — keep local, it will sync on next mutation
    } else if (remoteConfig && !localConfig) {
      // Reinstall case — restore from Firestore
      resolvedConfig = remoteConfig;
      resolvedSource = "remote";
      set({
        config: remoteConfig,
        cacheSource: resolvedSource,
        isStale: isConfigStale(remoteConfig),
      });
      await saveToAsyncStorage(remoteConfig);
    }
    // else: only local exists — keep it, will sync on next mutation

    set({
      isLoading: false,
      cacheSource: resolvedSource,
      isStale: isConfigStale(resolvedConfig),
    });
  },

  enterEditMode: () => set({ isEditMode: true }),
  exitEditMode: () => set({ isEditMode: false }),

  reorderWidgets: (uid: string, widgets: WidgetConfig[]) => {
    const config: DashboardConfig = {
      ...get().config,
      widgets,
      updatedAt: new Date().toISOString(),
    };
    set({ config });
    saveToAsyncStorage(config);
    scheduleFirestoreSync(uid, config);
  },

  toggleWidget: (uid: string, type: WidgetType, enabled: boolean) => {
    const current = get().config;
    const widgets = current.widgets.map((w) =>
      w.type === type ? { ...w, enabled } : w,
    );
    const config: DashboardConfig = {
      ...current,
      widgets,
      updatedAt: new Date().toISOString(),
    };
    set({ config });
    saveToAsyncStorage(config);
    scheduleFirestoreSync(uid, config);
  },

  resizeWidget: (uid: string, widgetId: string, size: WidgetSize) => {
    const current = get().config;
    const widgets = current.widgets.map((w) =>
      w.id === widgetId ? { ...w, size } : w,
    );
    const config: DashboardConfig = {
      ...current,
      widgets,
      updatedAt: new Date().toISOString(),
    };
    set({ config });
    saveToAsyncStorage(config);
    scheduleFirestoreSync(uid, config);
  },

  reset: () => {
    set({
      config: buildDefaultDashboardConfig(),
      isEditMode: false,
      cacheSource: "none",
      isStale: false,
    });
  },
}));
