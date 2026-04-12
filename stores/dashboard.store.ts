import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { ASYNC_STORAGE_KEY, buildDefaultDashboardConfig } from '@/constants/dashboard';
import { getDocument, updateDocument } from '@/lib/firestore';
import type { DashboardConfig, WidgetConfig, WidgetSize, WidgetType } from '@/types/dashboard';
import type { UserProfile } from '@/types';

// ─── Debounced Firestore sync ─────────────────────────────────────────────────
let _syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFirestoreSync(uid: string, config: DashboardConfig): void {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(async () => {
    try {
      await updateDocument('profiles', uid, { dashboard_config: config });
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

  initialize: async (uid: string) => {
    set({ isLoading: true });

    let localConfig: DashboardConfig | null = null;
    let remoteConfig: DashboardConfig | null = null;

    // Step 1: Read AsyncStorage (fast, optimistic)
    try {
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      if (raw) {
        localConfig = JSON.parse(raw) as DashboardConfig;
        set({ config: localConfig });
      }
    } catch {
      // Ignore parse errors
    }

    // Step 2: Read Firestore in background
    try {
      const profile = await getDocument<UserProfile>('profiles', uid);
      if (profile?.dashboard_config) {
        remoteConfig = profile.dashboard_config;
      }
    } catch {
      // Firestore unavailable (offline) — proceed with local
    }

    // Step 3: Reconcile
    if (!localConfig && !remoteConfig) {
      // First run — create default and persist to both
      const fresh = buildDefaultDashboardConfig();
      set({ config: fresh });
      await saveToAsyncStorage(fresh);
      scheduleFirestoreSync(uid, fresh);
    } else if (remoteConfig && localConfig) {
      // Both exist — pick newer by updatedAt (ISO string lexicographic comparison is valid for UTC)
      if (remoteConfig.updatedAt > localConfig.updatedAt) {
        set({ config: remoteConfig });
        await saveToAsyncStorage(remoteConfig);
      }
      // else: local is newer or equal — keep local, it will sync on next mutation
    } else if (remoteConfig && !localConfig) {
      // Reinstall case — restore from Firestore
      set({ config: remoteConfig });
      await saveToAsyncStorage(remoteConfig);
    }
    // else: only local exists — keep it, will sync on next mutation

    set({ isLoading: false });
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
      w.type === type ? { ...w, enabled } : w
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
      w.id === widgetId ? { ...w, size } : w
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
    set({ config: buildDefaultDashboardConfig(), isEditMode: false });
  },
}));
