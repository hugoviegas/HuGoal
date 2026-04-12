import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { setDocument } from "@/lib/firestore";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SocialAuthSection } from "@/components/auth/SocialAuthSection";
import { useRef, useState } from "react";
import { Moon, Smartphone, Sun } from "lucide-react-native";
import type { UserProfile } from "@/types";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof schema>;

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const isDark = useThemeStore((s) => s.isDark);
  const setMode = useThemeStore((s) => s.setMode);
  const showToast = useToastStore((s) => s.show);
  const [loading, setLoading] = useState(false);
  const {
    isLoading: isGoogleLoading,
    isReady: isGoogleReady,
    signInWithGoogle,
  } = useGoogleSignIn();
  const isPortuguese = i18n.language.startsWith("pt");
  const scrollViewRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const inputOffsets = useRef<Record<keyof SignupForm, number>>({
    name: 0,
    email: 0,
    password: 0,
    confirmPassword: 0,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      );
      await updateProfile(cred.user, { displayName: data.name });
      await sendEmailVerification(cred.user);

      const profile: Omit<UserProfile, "id"> = {
        email: data.email,
        name: data.name,
        username: "",
        allergies: [],
        dietary_restrictions: [],
        preferred_cuisines: [],
        xp: 0,
        streak_current: 0,
        streak_longest: 0,
        onboarding_complete: false,
        created_at: new Date().toISOString(),
      };
      await setDocument("profiles", cred.user.uid, profile);

      showToast("Verification email sent. Check your inbox.", "success");
      router.replace("/(auth)/verify-email");
    } catch (e: any) {
      const msg =
        e?.code === "auth/email-already-in-use"
          ? "An account with this email already exists."
          : e?.code === "auth/network-request-failed"
            ? "Network error. Check your connection."
            : (e?.message ?? t("common.error"));
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = handleSubmit(onSubmit);

  const setInputOffset = (field: keyof SignupForm, y: number) => {
    inputOffsets.current[field] = y;
  };

  const ensureInputVisible = (field: keyof SignupForm) => {
    const y = inputOffsets.current[field] ?? 0;
    scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
  };

  const handleGoogleSignup = async () => {
    try {
      const result = await signInWithGoogle();
      if (result.isNewProfile) {
        showToast(
          "Google account connected. Let\'s finish your profile.",
          "success",
        );
      } else {
        showToast("Welcome back.", "success");
      }
    } catch (e: any) {
      if (e?.message === "Google sign-in was cancelled.") {
        showToast("Google sign-up cancelled.", "info");
        return;
      }

      showToast(e?.message ?? "Failed to sign up with Google.", "error");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View
        style={{
          pointerEvents: "none",
          paddingTop: insets.top + 18,
          paddingHorizontal: 24,
          paddingBottom: 92,
          backgroundColor: "#0b1020",
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          zIndex: 0,
        }}
      >
        <Text
          style={{
            color: "#e8ecff",
            fontSize: 20,
            fontWeight: "800",
            marginBottom: 22,
          }}
        >
          HuGoal
        </Text>
        <Text
          style={{
            color: "#f4f6ff",
            fontSize: 44,
            lineHeight: 48,
            fontWeight: "800",
            maxWidth: 300,
          }}
        >
          Get Started now
        </Text>
        <Text
          style={{
            color: "#b4bdd8",
            fontSize: 16,
            marginTop: 14,
            lineHeight: 22,
            maxWidth: 320,
          }}
        >
          Create an account or log in to explore your personalized fitness app.
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={{ marginTop: -58, zIndex: 20, position: "relative" }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 14,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            borderRadius: 20,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 18,
            gap: 16,
            zIndex: 100,
            elevation: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 4,
            }}
          >
            <Pressable
              onPress={() => router.replace("/(auth)/login")}
              style={{
                flex: 1,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontWeight: "600",
                  fontSize: 17,
                }}
              >
                Log In
              </Text>
            </Pressable>
            <Pressable
              style={{
                flex: 1,
                borderRadius: 10,
                backgroundColor: colors.card,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontWeight: "700",
                  fontSize: 17,
                }}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>

          <SocialAuthSection
            onGooglePress={handleGoogleSignup}
            googleLoading={isGoogleLoading}
            googleDisabled={!isGoogleReady || loading}
            label="Or"
          />

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <View
                onLayout={(event) =>
                  setInputOffset("name", event.nativeEvent.layout.y)
                }
              >
                <Input
                  label={t("onboarding.name")}
                  placeholder="Your full name"
                  autoComplete="name"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() => ensureInputVisible("name")}
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.name?.message}
                />
              </View>
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View
                onLayout={(event) =>
                  setInputOffset("email", event.nativeEvent.layout.y)
                }
              >
                <Input
                  ref={emailInputRef}
                  label={t("auth.email")}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() => ensureInputVisible("email")}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.email?.message}
                />
              </View>
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View
                onLayout={(event) =>
                  setInputOffset("password", event.nativeEvent.layout.y)
                }
              >
                <Input
                  ref={passwordInputRef}
                  label={t("auth.password")}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() => ensureInputVisible("password")}
                  onSubmitEditing={() =>
                    confirmPasswordInputRef.current?.focus()
                  }
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.password?.message}
                />
              </View>
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <View
                onLayout={(event) =>
                  setInputOffset("confirmPassword", event.nativeEvent.layout.y)
                }
              >
                <Input
                  ref={confirmPasswordInputRef}
                  label={t("auth.confirm_password")}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onFocus={() => ensureInputVisible("confirmPassword")}
                  onSubmitEditing={handleSignupSubmit}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.confirmPassword?.message}
                />
              </View>
            )}
          />

          <Button
            variant="primary"
            size="lg"
            isLoading={loading}
            disabled={isGoogleLoading}
            onPress={handleSignupSubmit}
          >
            Sign Up
          </Button>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 4,
            }}
          >
            <Text style={{ color: colors.mutedForeground }}>
              {t("auth.have_account")}{" "}
            </Text>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                {t("auth.login")}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={{
            marginTop: 14,
            marginHorizontal: 2,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.card,
            paddingVertical: 12,
            paddingHorizontal: 14,
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {isDark ? t("auth.theme_dark") : t("auth.theme_light")}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Pressable
                onPress={() => setMode("light")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor:
                    mode === "light" ? colors.primary : colors.cardBorder,
                  backgroundColor:
                    mode === "light" ? colors.secondary : colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sun
                  size={16}
                  color={
                    mode === "light" ? colors.primary : colors.mutedForeground
                  }
                />
              </Pressable>

              <Pressable
                onPress={() => setMode("dark")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor:
                    mode === "dark" ? colors.primary : colors.cardBorder,
                  backgroundColor:
                    mode === "dark" ? colors.secondary : colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Moon
                  size={16}
                  color={
                    mode === "dark" ? colors.primary : colors.mutedForeground
                  }
                />
              </Pressable>

              <Pressable
                onPress={() => setMode("system")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor:
                    mode === "system" ? colors.primary : colors.cardBorder,
                  backgroundColor:
                    mode === "system" ? colors.secondary : colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Smartphone
                  size={16}
                  color={
                    mode === "system" ? colors.primary : colors.mutedForeground
                  }
                />
              </Pressable>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {isPortuguese
                ? `${t("auth.language_toggle")}: ${t("auth.language_pt")}`
                : `${t("auth.language_toggle")}: ${t("auth.language_en")}`}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Pressable
                onPress={() => {
                  void i18n.changeLanguage("pt");
                }}
                style={{
                  minWidth: 40,
                  height: 34,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isPortuguese
                    ? colors.primary
                    : colors.cardBorder,
                  backgroundColor: isPortuguese
                    ? colors.secondary
                    : colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 8,
                }}
              >
                <Text
                  style={{
                    color: isPortuguese
                      ? colors.primary
                      : colors.mutedForeground,
                    fontWeight: "700",
                    fontSize: 12,
                  }}
                >
                  PT
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void i18n.changeLanguage("en");
                }}
                style={{
                  minWidth: 40,
                  height: 34,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: !isPortuguese
                    ? colors.primary
                    : colors.cardBorder,
                  backgroundColor: !isPortuguese
                    ? colors.secondary
                    : colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 8,
                }}
              >
                <Text
                  style={{
                    color: !isPortuguese
                      ? colors.primary
                      : colors.mutedForeground,
                    fontWeight: "700",
                    fontSize: 12,
                  }}
                >
                  EN
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
