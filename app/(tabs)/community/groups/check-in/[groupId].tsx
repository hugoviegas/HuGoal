import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Camera, CheckCircle } from "lucide-react-native";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";
import { useCommunityStore } from "@/stores/community.store";
import { getGroup } from "@/lib/community-groups";
import { getTodayCheckIn } from "@/lib/community-checkins";
import type { CommunityGroup, GroupCheckIn } from "@/types";

function exifDateToIso(exifDate: string): string {
  try {
    const parts = exifDate.split(" ");
    if (parts.length !== 2) return new Date().toISOString();
    const datePart = parts[0].replace(/:/g, "-");
    return new Date(`${datePart}T${parts[1]}`).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export default function CheckInScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeStore((s) => s.colors);
  const uid = useAuthStore((s) => s.user?.uid);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);
  const submitCheckIn = useCommunityStore((s) => s.submitCheckIn);

  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [existingCheckIn, setExistingCheckIn] = useState<GroupCheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [exifTaken, setExifTaken] = useState<string | undefined>(undefined);
  const [metricValue, setMetricValue] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!groupId || !uid) return;
    Promise.all([getGroup(groupId), getTodayCheckIn(groupId, uid)])
      .then(([g, ci]) => {
        setGroup(g);
        setExistingCheckIn(ci);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId, uid]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Permissão de mídia necessária", "warning");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
      exif: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      const exifData = asset.exif as Record<string, unknown> | undefined;
      if (exifData?.DateTimeOriginal) {
        setExifTaken(exifData.DateTimeOriginal as string);
      }
    }
  };

  const handleSubmit = async () => {
    if (!uid || !profile || !group || !metricValue.trim()) return;
    const numericValue = parseFloat(metricValue.replace(",", "."));
    if (isNaN(numericValue) || numericValue <= 0) {
      showToast("Insira um valor válido", "warning");
      return;
    }

    setSubmitting(true);
    try {
      await submitCheckIn(groupId!, uid, {
        user_name: profile.name,
        user_avatar: profile.avatar_url,
        challenge_type: group.challenge_type,
        metric_value: numericValue,
        metric_unit: group.challenge_config.unit,
        notes: notes.trim() || undefined,
        imageUri: imageUri ?? undefined,
        exifDateTimeOriginal: exifTaken,
      });
      showToast("Check-in registrado!", "success");
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao registrar";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Already checked in today
  if (existingCheckIn) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top + 8,
        }}
      >
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: colors.cardBorder,
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: pressed ? colors.surface : colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <ArrowLeft size={18} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>
            Check-in
          </Text>
        </View>

        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}
        >
          <CheckCircle size={64} color={colors.primary} />
          <Text
            style={{
              color: colors.foreground,
              fontSize: 20,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Já fez check-in hoje!
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 15,
              textAlign: "center",
            }}
          >
            Você registrou{" "}
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {existingCheckIn.metric_value} {existingCheckIn.metric_unit}
            </Text>{" "}
            hoje. Volte amanhã!
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: pressed ? colors.primary + "CC" : colors.primary,
            })}
          >
            <Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: "700" }}>
              Voltar
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const unit = group?.challenge_config.unit ?? "";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: pressed ? colors.surface : colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <ArrowLeft size={18} color={colors.foreground} />
        </Pressable>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>
          Check-in Diário
        </Text>
        <Pressable
          onPress={handleSubmit}
          disabled={!metricValue.trim() || submitting}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor:
              !metricValue.trim() || submitting
                ? colors.muted
                : pressed
                  ? colors.primary + "CC"
                  : colors.primary,
          })}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text
              style={{
                color:
                  !metricValue.trim()
                    ? colors.mutedForeground
                    : colors.primaryForeground,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              Registrar
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Group info */}
        {group && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: 14,
            }}
          >
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 12,
                fontWeight: "600",
                marginBottom: 4,
              }}
            >
              GRUPO
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
              {group.name}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }}>
              Meta: {group.challenge_config.goal}
            </Text>
          </View>
        )}

        {/* Metric input */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
            {unit
              ? `Quanto você fez hoje? (${unit})`
              : "Quanto você fez hoje?"}{" "}
            *
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              overflow: "hidden",
            }}
          >
            <TextInput
              value={metricValue}
              onChangeText={setMetricValue}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                paddingHorizontal: 14,
                paddingVertical: 14,
                color: colors.foreground,
                fontSize: 24,
                fontWeight: "700",
              }}
            />
            {unit ? (
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  borderLeftWidth: 1,
                  borderLeftColor: colors.cardBorder,
                }}
              >
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {unit}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Image picker */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
            Foto (opcional)
          </Text>
          {imageUri ? (
            <View style={{ position: "relative" }}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 12 }}
                resizeMode="cover"
              />
              <Pressable
                onPress={() => {
                  setImageUri(null);
                  setExifTaken(undefined);
                }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 13 }}>Remover</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickImage}
              style={({ pressed }) => ({
                height: 120,
                backgroundColor: pressed ? colors.surface : colors.surface + "80",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderStyle: "dashed",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              })}
            >
              <Camera size={28} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                Adicionar foto do treino
              </Text>
            </Pressable>
          )}
          {exifTaken && (
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
              Foto tirada em:{" "}
              {new Date(exifDateToIso(exifTaken)).toLocaleString("pt-BR")}
            </Text>
          )}
        </View>

        {/* Notes */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
            Observações (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Como foi o treino? Compartilhe com o grupo..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.foreground,
              fontSize: 15,
              minHeight: 100,
              textAlignVertical: "top",
            }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
