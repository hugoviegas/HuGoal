import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bug,
  Camera,
  ImagePlus,
  RefreshCcw,
} from "lucide-react-native";

import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import {
  benchmarkNutritionModels,
  type NutritionModelTestResult,
} from "@/lib/nutrition-vision";
import {
  GEMINI_MODEL_LIMITS,
  getRecommendedVisionModel,
} from "@/constants/ai-models";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { typography } from "@/constants/typography";

type AnalysisType = "meal_photo" | "nutrition_label";

function formatMs(duration: number): string {
  if (!Number.isFinite(duration)) return "0 ms";
  if (duration < 1000) return `${Math.round(duration)} ms`;
  return `${(duration / 1000).toFixed(2)} s`;
}

export default function NutritionAIDebugScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);

  const [analysisType, setAnalysisType] = useState<AnalysisType>("meal_photo");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<NutritionModelTestResult[]>([]);
  const [expandedModelIds, setExpandedModelIds] = useState<
    Record<string, boolean>
  >({});

  const recommended = useMemo(() => getRecommendedVisionModel(), []);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Permissao da galeria negada", "error");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      showToast("Falha ao carregar base64 da imagem", "error");
      return;
    }

    setImageBase64(asset.base64);
    setImageUri(asset.uri);
    setResults([]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showToast("Permissao da camera negada", "error");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      showToast("Falha ao capturar base64 da imagem", "error");
      return;
    }

    setImageBase64(asset.base64);
    setImageUri(asset.uri);
    setResults([]);
  };

  const runBenchmark = async () => {
    if (!imageBase64) {
      showToast("Selecione ou tire uma foto antes de testar", "info");
      return;
    }

    try {
      setRunning(true);
      const modelResults = await benchmarkNutritionModels(
        imageBase64,
        analysisType,
      );
      setResults(modelResults);
      setExpandedModelIds({});

      const successCount = modelResults.filter((item) => item.success).length;
      showToast(
        `${successCount}/${modelResults.length} modelos retornaram resultado`,
        successCount > 0 ? "success" : "error",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao executar benchmark";
      showToast(message, "error");
    } finally {
      setRunning(false);
    }
  };

  const toggleExpanded = (modelId: string) => {
    setExpandedModelIds((prev) => ({
      ...prev,
      [modelId]: !prev[modelId],
    }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={[typography.h3, { color: colors.foreground }]}>
            AI Debug
          </Text>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            Benchmark de modelos para nutricao por imagem
          </Text>
        </View>

        <Bug size={20} color={colors.primary} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + 24,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: radius.lg,
            padding: spacing.md,
            gap: spacing.sm,
          }}
        >
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            Modo de analise
          </Text>

          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            <Pressable
              onPress={() => setAnalysisType("meal_photo")}
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor:
                  analysisType === "meal_photo"
                    ? colors.primary
                    : colors.cardBorder,
                backgroundColor:
                  analysisType === "meal_photo"
                    ? `${colors.primary}22`
                    : colors.background,
              }}
            >
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Prato
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setAnalysisType("nutrition_label")}
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor:
                  analysisType === "nutrition_label"
                    ? colors.primary
                    : colors.cardBorder,
                backgroundColor:
                  analysisType === "nutrition_label"
                    ? `${colors.primary}22`
                    : colors.background,
              }}
            >
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Tabela nutricional
              </Text>
            </Pressable>
          </View>

          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            Modelo recomendado por limite + visao: {recommended.label}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: radius.lg,
            padding: spacing.md,
            gap: spacing.sm,
          }}
        >
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            Imagem de teste
          </Text>

          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: 210, borderRadius: radius.md }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: colors.cardBorder,
                backgroundColor: colors.background,
                borderRadius: radius.md,
                height: 160,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={[typography.body, { color: colors.mutedForeground }]}
              >
                Nenhuma imagem selecionada
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            <Pressable
              onPress={pickImage}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                backgroundColor: colors.background,
              }}
            >
              <ImagePlus size={16} color={colors.foreground} />
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Galeria
              </Text>
            </Pressable>

            <Pressable
              onPress={takePhoto}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                backgroundColor: colors.background,
              }}
            >
              <Camera size={16} color={colors.foreground} />
              <Text
                style={[typography.smallMedium, { color: colors.foreground }]}
              >
                Camera
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={runBenchmark}
            disabled={running}
            style={{
              minHeight: 48,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.primary,
              opacity: running ? 0.65 : 1,
              flexDirection: "row",
              gap: 8,
            }}
          >
            {running ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <RefreshCcw size={16} color="#fff" />
            )}
            <Text style={[typography.smallMedium, { color: "#fff" }]}>
              {running ? "Executando testes..." : "Testar todos os modelos"}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.smallMedium, { color: colors.foreground }]}>
            Resultados por modelo
          </Text>

          {GEMINI_MODEL_LIMITS.map((model) => {
            const result = results.find(
              (item) => item.model.modelId === model.modelId,
            );
            const expanded = expandedModelIds[model.modelId] === true;
            const parsedJson = result?.parsed
              ? JSON.stringify(result.parsed, null, 2)
              : null;
            const rawJson = result?.rawText ?? null;
            return (
              <View
                key={model.modelId}
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  gap: spacing.xs,
                }}
              >
                <Text
                  style={[typography.bodyMedium, { color: colors.foreground }]}
                >
                  {model.label}
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.mutedForeground },
                  ]}
                >
                  ID: {model.modelId}
                </Text>
                {result?.effectiveModelId &&
                result.effectiveModelId !== model.modelId ? (
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Executado com alias: {result.effectiveModelId}
                  </Text>
                ) : null}
                <Text
                  style={[
                    typography.caption,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Limite: {model.rpm} RPM · {model.tpm} TPM · {model.rpd} ·
                  visao {model.vision ? "sim" : "nao"}
                </Text>

                {!result ? (
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Sem execucao neste ciclo
                  </Text>
                ) : result.success ? (
                  <>
                    <Text
                      style={[typography.caption, { color: colors.primary }]}
                    >
                      Sucesso em {formatMs(result.durationMs)}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Itens detectados: {result.parsed?.foods.length ?? 0} ·
                      Confirmacao:{" "}
                      {result.parsed?.needs_user_confirmation
                        ? "necessaria"
                        : "nao"}
                    </Text>

                    <Pressable
                      onPress={() => toggleExpanded(model.modelId)}
                      style={{
                        marginTop: spacing.xs,
                        minHeight: 40,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        backgroundColor: colors.background,
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: spacing.sm,
                      }}
                    >
                      <Text
                        style={[
                          typography.caption,
                          { color: colors.foreground },
                        ]}
                      >
                        {expanded ? "Ocultar JSON" : "Ver JSON retornado"}
                      </Text>
                    </Pressable>

                    {expanded ? (
                      <View
                        style={{
                          marginTop: spacing.xs,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                          backgroundColor: colors.background,
                          padding: spacing.sm,
                          maxHeight: 260,
                        }}
                      >
                        <ScrollView nestedScrollEnabled>
                          <Text
                            selectable
                            style={[
                              typography.caption,
                              {
                                color: colors.foreground,
                                fontFamily: "monospace",
                              },
                            ]}
                          >
                            {parsedJson ?? rawJson ?? "Sem retorno para exibir"}
                          </Text>
                        </ScrollView>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <Text
                    style={[typography.caption, { color: colors.destructive }]}
                  >
                    Erro em {formatMs(result.durationMs)}: {result.error}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
