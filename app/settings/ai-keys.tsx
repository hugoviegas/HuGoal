import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  FlaskConical,
  KeyRound,
  Shield,
  Trash2,
} from "lucide-react-native";

import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { useAuthStore } from "@/stores/auth.store";
import { updateDocument } from "@/lib/firestore";
import {
  deleteApiKey,
  getApiKey,
  getResolvedApiKey,
  maskApiKey,
  saveApiKey,
} from "@/lib/api-key-store";
import { testProviderApiKey, type AIKeyTestStatus } from "@/lib/ai-provider";
import {
  getUsageThisMonth,
  getDefaultMonthlyBudget,
} from "@/lib/ai-usage-tracker";
import type { AIProvider } from "@/types";

type KeySource = "user" | "preview" | "none";

type ProviderCardState = {
  hasUserKey: boolean;
  source: KeySource;
  masked: string;
  status: AIKeyTestStatus | "unchecked";
  checkedAt?: string;
};

const PROVIDERS: AIProvider[] = ["gemini", "claude", "openai"];

const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: "Gemini (Google)",
  claude: "Claude (Anthropic)",
  openai: "OpenAI",
};

const PROVIDER_GUIDES: Record<AIProvider, string> = {
  gemini: "https://aistudio.google.com/app/apikey",
  claude: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
};

function formatCheckedAt(value?: string): string {
  if (!value) return "Never checked";

  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return "Never checked";

  const deltaMs = Date.now() - ts;
  const deltaMin = Math.max(0, Math.floor(deltaMs / 60000));
  if (deltaMin < 1) return "Checked just now";
  if (deltaMin === 1) return "Checked 1 minute ago";
  if (deltaMin < 60) return `Checked ${deltaMin} minutes ago`;

  const deltaHours = Math.floor(deltaMin / 60);
  if (deltaHours === 1) return "Checked 1 hour ago";
  return `Checked ${deltaHours} hours ago`;
}

function statusMeta(status: ProviderCardState["status"]) {
  if (status === "valid") {
    return { label: "Valid key", tone: "ok" as const };
  }
  if (status === "unchecked") {
    return { label: "Not tested", tone: "neutral" as const };
  }
  if (status === "rate_limited") {
    return { label: "Rate limited", tone: "warn" as const };
  }
  if (status === "quota_exceeded") {
    return { label: "Quota exceeded", tone: "warn" as const };
  }
  if (status === "invalid") {
    return { label: "Invalid key", tone: "error" as const };
  }
  if (status === "network_error") {
    return { label: "Network error", tone: "warn" as const };
  }
  return { label: "Provider unavailable", tone: "error" as const };
}

export default function AIKeysSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(
    profile?.preferred_ai_provider ?? "gemini",
  );
  const [states, setStates] = useState<Record<AIProvider, ProviderCardState>>({
    gemini: {
      hasUserKey: false,
      source: "none",
      masked: "No key",
      status: "unchecked",
    },
    claude: {
      hasUserKey: false,
      source: "none",
      masked: "No key",
      status: "unchecked",
    },
    openai: {
      hasUserKey: false,
      source: "none",
      masked: "No key",
      status: "unchecked",
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [usageSummary, setUsageSummary] = useState<{
    requests_count: number;
    total_cost: number;
  } | null>(null);
  const [monthlyBudget] = useState(() => getDefaultMonthlyBudget());

  const selectedState = states[selectedProvider];

  const infoText = useMemo(() => {
    if (!selectedState) return "No key configured";
    if (selectedState.source === "user") return "Using your device-only key";
    if (profile?.is_pro) return "Using the shared Gemini key unlocked by Pro";
    // Do not announce preview/fallback keys in the UI to avoid exposing
    // that a secret exists. Treat preview as "no user key configured".
    return "No key configured";
  }, [selectedState, profile?.is_pro]);

  useEffect(() => {
    if (!profile?.preferred_ai_provider) return;
    setSelectedProvider(profile.preferred_ai_provider);
  }, [profile?.preferred_ai_provider]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const entries = await Promise.all(
          PROVIDERS.map(async (provider) => {
            const userKey = await getApiKey(provider);
            const resolved = await getResolvedApiKey(provider);
            // Never reveal or partially show preview (env) keys in the UI.
            const masked =
              resolved.source === "preview"
                ? "Hidden"
                : resolved.key
                  ? maskApiKey(resolved.key)
                  : "No key";

            return [
              provider,
              {
                hasUserKey: Boolean(userKey),
                source: resolved.source,
                masked,
                status: "unchecked" as const,
              },
            ] as const;
          }),
        );

        setStates(
          Object.fromEntries(entries) as Record<AIProvider, ProviderCardState>,
        );
      } catch {
        showToast("Failed to load AI key states", "error");
      } finally {
        setLoading(false);
      }
    };

    void load();
    void (async () => {
      try {
        const u = await getUsageThisMonth();
        setUsageSummary(u);
      } catch {
        // ignore usage load errors
      }
    })();
  }, [showToast]);

  useEffect(() => {
    // refresh usage when keys are changed or tested
    if (saving || testing || deleting) return;
    void (async () => {
      try {
        const u = await getUsageThisMonth();
        setUsageSummary(u);
      } catch {
        // ignore
      }
    })();
  }, [saving, testing, deleting]);

  const applyProviderPreference = async (provider: AIProvider) => {
    setSelectedProvider(provider);

    if (!user?.uid) return;

    try {
      await updateDocument("profiles", user.uid, {
        preferred_ai_provider: provider,
      });
      if (profile) {
        setProfile({ ...profile, preferred_ai_provider: provider });
      }
    } catch {
      showToast("Could not sync preferred provider", "error");
    }
  };

  const handleSaveKey = async () => {
    const normalized = keyInput.trim();
    if (!normalized) {
      showToast("Enter an API key first", "error");
      return;
    }

    if (normalized.length < 16) {
      showToast("API key looks too short", "error");
      return;
    }

    setSaving(true);
    try {
      await saveApiKey(selectedProvider, normalized);
      setKeyInput("");

      const test = await testProviderApiKey(selectedProvider, normalized);
      const checkedAt = new Date().toISOString();

      setStates((prev) => ({
        ...prev,
        [selectedProvider]: {
          hasUserKey: true,
          source: "user",
          masked: maskApiKey(normalized),
          status: test.status,
          checkedAt,
        },
      }));

      if (test.status === "valid") {
        showToast("API key saved and validated", "success");
      } else {
        showToast(
          `Key saved, test result: ${statusMeta(test.status).label}`,
          "info",
        );
      }
    } catch {
      showToast("Failed to save API key", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const resolved = await getResolvedApiKey(selectedProvider);
      if (!resolved.key) {
        showToast("No key to test. Add one first.", "error");
        return;
      }

      const result = await testProviderApiKey(selectedProvider, resolved.key);
      const checkedAt = new Date().toISOString();

      setStates((prev) => ({
        ...prev,
        [selectedProvider]: {
          ...prev[selectedProvider],
          source: resolved.source,
          status: result.status,
          checkedAt,
          masked: maskApiKey(resolved.key as string),
        },
      }));

      if (result.status === "valid") {
        showToast(`Connection OK (${result.durationMs}ms)`, "success");
      } else {
        showToast(statusMeta(result.status).label, "error");
      }
    } catch {
      showToast("Failed to test provider key", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteApiKey(selectedProvider);
      const resolved = await getResolvedApiKey(selectedProvider);

      setStates((prev) => ({
        ...prev,
        [selectedProvider]: {
          hasUserKey: false,
          source: resolved.source,
          masked: resolved.key ? maskApiKey(resolved.key) : "No key",
          status: "unchecked",
        },
      }));

      showToast("Stored API key deleted from this device", "success");
    } catch {
      showToast("Failed to delete API key", "error");
    } finally {
      setDeleting(false);
    }
  };

  const keyPreviewText = revealedKey
    ? revealedKey
    : selectedState?.source === "none"
      ? "No key"
      : "••••••••••";

  const selectedStatusMeta = statusMeta(selectedState?.status ?? "unchecked");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 16,
        gap: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ padding: 4, marginLeft: -4 }}
        >
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text
          style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}
        >
          AI Provider Keys
        </Text>
      </View>

      {/* Usage summary */}
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: colors.card,
          padding: 14,
          gap: 10,
        }}
      >
        <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
          Usage (This month)
        </Text>
        <Text
          style={{ color: colors.foreground, fontWeight: "700", fontSize: 18 }}
        >
          {usageSummary
            ? `${usageSummary.requests_count} requests · $${usageSummary.total_cost.toFixed(3)}`
            : "No usage yet"}
        </Text>

        <View
          style={{
            height: 10,
            backgroundColor: colors.cardBorder,
            borderRadius: 8,
            overflow: "hidden",
            marginTop: 8,
          }}
        >
          <View
            style={{
              height: 10,
              width: `${Math.min(100, usageSummary ? (usageSummary.total_cost / monthlyBudget) * 100 : 0)}%`,
              backgroundColor:
                usageSummary && usageSummary.total_cost / monthlyBudget >= 0.8
                  ? colors.destructive
                  : colors.primary,
            }}
          />
        </View>

        {usageSummary && usageSummary.total_cost / monthlyBudget >= 0.8 ? (
          <View
            style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 8,
              backgroundColor: `${colors.destructive}14`,
            }}
          >
            <Text style={{ color: colors.destructive, fontWeight: "700" }}>
              Approaching monthly budget
            </Text>
            <Text style={{ color: colors.mutedForeground }}>
              You reached{" "}
              {((usageSummary.total_cost / monthlyBudget) * 100).toFixed(0)}% of
              your estimated monthly budget (${monthlyBudget}).
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: colors.card,
          padding: 14,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Shield size={16} color={colors.primary} />
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>
            Security policy
          </Text>
        </View>
        <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>
          Keys are stored only on this device. They are never uploaded to
          Firestore. During development, ENV fallback keys can be used if no
          user key exists.
        </Text>
      </View>

      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: colors.card,
          padding: 14,
          gap: 10,
        }}
      >
        <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
          Preferred provider
        </Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {PROVIDERS.map((provider) => {
            const active = provider === selectedProvider;
            return (
              <Pressable
                key={provider}
                onPress={() => {
                  void applyProviderPreference(provider);
                }}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.cardBorder,
                  backgroundColor: active
                    ? `${colors.primary}1A`
                    : colors.background,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  minHeight: 40,
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: active ? colors.primary : colors.foreground,
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {PROVIDER_LABELS[provider]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: colors.card,
          padding: 14,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <KeyRound size={16} color={colors.primary} />
          <Text
            style={{ color: colors.foreground, fontWeight: "700", flex: 1 }}
          >
            {PROVIDER_LABELS[selectedProvider]}
          </Text>
          <View
            style={{
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor:
                selectedStatusMeta.tone === "ok"
                  ? "rgba(34, 197, 94, 0.15)"
                  : selectedStatusMeta.tone === "error"
                    ? `${colors.destructive}1F`
                    : "rgba(245, 158, 11, 0.15)",
            }}
          >
            <Text
              style={{
                color:
                  selectedStatusMeta.tone === "ok"
                    ? "#22C55E"
                    : selectedStatusMeta.tone === "error"
                      ? colors.destructive
                      : "#F59E0B",
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              {selectedStatusMeta.label}
            </Text>
          </View>
        </View>

        <Text style={{ color: colors.mutedForeground }}>{infoText}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
          {formatCheckedAt(selectedState?.checkedAt)}
        </Text>

        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: colors.foreground, flex: 1 }}>
            {keyPreviewText}
          </Text>
          <Pressable
            onPress={async () => {
              if (revealedKey) {
                setRevealedKey(null);
                return;
              }

              const resolved = await getResolvedApiKey(selectedProvider);
              if (!resolved.key) {
                showToast("No key available to reveal", "info");
                return;
              }

              if (resolved.source === "preview") {
                // For security, never reveal ENV/preview keys in the app UI.
                showToast(
                  "This key is provided by the system and is hidden",
                  "info",
                );
                return;
              }

              setRevealedKey(resolved.key);
              setTimeout(() => {
                setRevealedKey(null);
              }, 1000);
            }}
            style={{ padding: 4 }}
          >
            {revealedKey ? (
              <EyeOff size={18} color={colors.mutedForeground} />
            ) : (
              <Eye size={18} color={colors.mutedForeground} />
            )}
          </Pressable>
        </View>

        <TextInput
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder="Paste your API key"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            color: colors.foreground,
            backgroundColor: colors.background,
            paddingHorizontal: 12,
            paddingVertical: 12,
            minHeight: 48,
          }}
        />

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => {
              void handleSaveKey();
            }}
            disabled={saving}
            style={{
              minHeight: 44,
              borderRadius: 12,
              paddingHorizontal: 14,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: colors.primary,
              opacity: saving ? 0.7 : 1,
              flexDirection: "row",
              gap: 8,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <CheckCircle2 size={16} color="#fff" />
            )}
            <Text style={{ color: "#fff", fontWeight: "700" }}>Save Key</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void handleTest();
            }}
            disabled={testing || loading}
            style={{
              minHeight: 44,
              borderRadius: 12,
              paddingHorizontal: 14,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.cardBorder,
              backgroundColor: colors.background,
              opacity: testing || loading ? 0.7 : 1,
              flexDirection: "row",
              gap: 8,
            }}
          >
            {testing ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <FlaskConical size={16} color={colors.foreground} />
            )}
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              Test Key
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void handleDelete();
            }}
            disabled={deleting}
            style={{
              minHeight: 44,
              borderRadius: 12,
              paddingHorizontal: 14,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: `${colors.destructive}55`,
              backgroundColor: `${colors.destructive}14`,
              opacity: deleting ? 0.7 : 1,
              flexDirection: "row",
              gap: 8,
            }}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <Trash2 size={16} color={colors.destructive} />
            )}
            <Text style={{ color: colors.destructive, fontWeight: "700" }}>
              Delete Key
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.background,
            padding: 10,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <CircleAlert size={14} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
              Setup guide
            </Text>
          </View>
          <Pressable
            onPress={() => {
              void Linking.openURL(PROVIDER_GUIDES[selectedProvider]);
            }}
            style={{ paddingVertical: 2 }}
          >
            <Text style={{ color: colors.primary, lineHeight: 18 }}>
              Open provider setup guide
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
