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
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { useThemeStore } from "@/stores/theme.store";
import { useToastStore } from "@/stores/toast.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SocialAuthSection } from "@/components/auth/SocialAuthSection";
import { useRef, useState } from "react";
import { Moon, Smartphone, Sun } from "lucide-react-native";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const isDark = useThemeStore((s) => s.isDark);
  const setMode = useThemeStore((s) => s.setMode);
  const showToast = useToastStore((s) => s.show);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const {
    isLoading: isGoogleLoading,
    isReady: isGoogleReady,
    signInWithGoogle,
  } = useGoogleSignIn();
  const isPortuguese = i18n.language.startsWith("pt");
  const passwordInputRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // Auth store listener handles redirect.
    } catch (e: any) {
      const msg =
        e?.code === "auth/user-not-found"
          ? "No account found with this email."
          : e?.code === "auth/wrong-password"
            ? "Incorrect password."
            : e?.message || "Failed to login";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = handleSubmit(onSubmit);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      showToast(e?.message || "Google sign-in failed.", "error");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                Log In
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace("/(auth)/signup")}
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
                Sign Up
              </Text>
            </Pressable>
          </View>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t("auth.email")}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t("auth.password")}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLoginSubmit}
                ref={passwordInputRef}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Pressable
              onPress={() => setRememberMe((prev) => !prev)}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  borderWidth: 1.5,
                  borderColor: rememberMe ? colors.primary : colors.cardBorder,
                  backgroundColor: rememberMe ? colors.primary : "transparent",
                }}
              />
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                Remember me
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                showToast("Forgot password flow coming soon.", "info")
              }
            >
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                Forgot Password?
              </Text>
            </Pressable>
          </View>

          <Button
            variant="primary"
            size="lg"
            isLoading={loading}
            disabled={isGoogleLoading}
            onPress={handleLoginSubmit}
          >
            Log In
          </Button>

          <SocialAuthSection
            onGooglePress={handleGoogleLogin}
            googleLoading={isGoogleLoading}
            googleDisabled={!isGoogleReady || loading}
            label="Or"
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 4,
            }}
          >
            <Text style={{ color: colors.mutedForeground }}>
              {t("auth.no_account")}{" "}
            </Text>
            <Pressable onPress={() => router.replace("/(auth)/signup")}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                {t("auth.signup")}
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
