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
  signInWithEmailAndPassword,
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

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z
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

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

const COOLDOWN_MS = 3000;

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const isDark = useThemeStore((s) => s.isDark);
  const setMode = useThemeStore((s) => s.setMode);
  const showToast = useToastStore((s) => s.show);

  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginCooldown, setLoginCooldown] = useState(false);
  const [signupCooldown, setSignupCooldown] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const {
    isLoading: isGoogleLoading,
    isReady: isGoogleReady,
    signInWithGoogle,
  } = useGoogleSignIn();

  const isPortuguese = i18n.language.startsWith("pt");

  const loginPasswordRef = useRef<TextInput>(null);
  const {
    control: loginControl,
    handleSubmit: loginHandleSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const signupEmailRef = useRef<TextInput>(null);
  const signupPasswordRef = useRef<TextInput>(null);
  const signupConfirmRef = useRef<TextInput>(null);
  const inputOffsets = useRef<Record<keyof SignupForm, number>>({
    name: 0,
    email: 0,
    password: 0,
    confirmPassword: 0,
  });

  const {
    control: signupControl,
    handleSubmit: signupHandleSubmit,
    formState: { errors: signupErrors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const startCooldown = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), COOLDOWN_MS);
  };

  const onLoginSubmit = async (data: LoginForm) => {
    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(
        auth,
        data.email.trim().toLowerCase(),
        data.password,
      );
    } catch (e: any) {
      const code = e?.code as string | undefined;
      const msg =
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
          ? "Invalid credentials."
          : code === "auth/network-request-failed"
            ? "Network error. Check your connection."
            : "Failed to log in. Please try again.";
      showToast(msg, "error");
      startCooldown(setLoginCooldown);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLoginSubmit = loginHandleSubmit(onLoginSubmit);

  const onSignupSubmit = async (data: SignupForm) => {
    setSignupLoading(true);
    try {
      const email = data.email.trim().toLowerCase();
      const name = data.name.trim();
      const cred = await createUserWithEmailAndPassword(auth, email, data.password);
      await updateProfile(cred.user, { displayName: name });
      await sendEmailVerification(cred.user);

      const profile: Omit<UserProfile, "id"> = {
        email,
        name,
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
      const code = e?.code as string | undefined;
      const msg =
        code === "auth/email-already-in-use"
          ? "An account with this email already exists."
          : code === "auth/network-request-failed"
            ? "Network error. Check your connection."
            : "Failed to sign up. Please try again.";
      showToast(msg, "error");
      startCooldown(setSignupCooldown);
    } finally {
      setSignupLoading(false);
    }
  };

  const handleSignupSubmit = signupHandleSubmit(onSignupSubmit);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (e?.message === "Google sign-in was cancelled.") return;
      showToast(e?.message || "Google sign-in failed.", "error");
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const result = await signInWithGoogle();
      if (result.isNewProfile) {
        showToast("Google account connected. Let's finish your profile.", "success");
      }
    } catch (e: any) {
      if (e?.message === "Google sign-in was cancelled.") return;
      showToast(e?.message ?? "Failed to sign up with Google.", "error");
    }
  };

  const setInputOffset = (field: keyof SignupForm, y: number) => {
    inputOffsets.current[field] = y;
  };

  const ensureInputVisible = (field: keyof SignupForm) => {
    const y = inputOffsets.current[field] ?? 0;
    scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            paddingTop: insets.top + 18,
            paddingHorizontal: 24,
            paddingBottom: 32,
            backgroundColor: "#0b1020",
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
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

        <View style={{ paddingHorizontal: 14, marginTop: 14 }}>
          <View
            style={{
              borderRadius: 20,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: 18,
              gap: 16,
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
              {(["login", "signup"] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    backgroundColor:
                      activeTab === tab ? colors.card : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      color:
                        activeTab === tab
                          ? colors.foreground
                          : colors.mutedForeground,
                      fontWeight: activeTab === tab ? "700" : "600",
                      fontSize: 17,
                    }}
                  >
                    {tab === "login" ? "Log In" : "Sign Up"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {activeTab === "login" ? (
              <>
                <Controller
                  control={loginControl}
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
                      onSubmitEditing={() => loginPasswordRef.current?.focus()}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={loginErrors.email?.message}
                    />
                  )}
                />

                <Controller
                  control={loginControl}
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
                      ref={loginPasswordRef}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={loginErrors.password?.message}
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
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        borderWidth: 1.5,
                        borderColor: rememberMe
                          ? colors.primary
                          : colors.cardBorder,
                        backgroundColor: rememberMe
                          ? colors.primary
                          : "transparent",
                      }}
                    />
                    <Text
                      style={{ color: colors.mutedForeground, fontSize: 14 }}
                    >
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
                  isLoading={loginLoading}
                  disabled={isGoogleLoading || loginCooldown}
                  onPress={handleLoginSubmit}
                >
                  Log In
                </Button>

                <SocialAuthSection
                  onGooglePress={handleGoogleLogin}
                  googleLoading={isGoogleLoading}
                  googleDisabled={!isGoogleReady || loginLoading}
                  label="Or"
                />
              </>
            ) : (
              <>
                <SocialAuthSection
                  onGooglePress={handleGoogleSignup}
                  googleLoading={isGoogleLoading}
                  googleDisabled={!isGoogleReady || signupLoading}
                  label="Or"
                />

                <Controller
                  control={signupControl}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      onLayout={(e) =>
                        setInputOffset("name", e.nativeEvent.layout.y)
                      }
                    >
                      <Input
                        label={t("onboarding.name")}
                        placeholder="Your full name"
                        autoComplete="name"
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onFocus={() => ensureInputVisible("name")}
                        onSubmitEditing={() => signupEmailRef.current?.focus()}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={signupErrors.name?.message}
                      />
                    </View>
                  )}
                />

                <Controller
                  control={signupControl}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      onLayout={(e) =>
                        setInputOffset("email", e.nativeEvent.layout.y)
                      }
                    >
                      <Input
                        ref={signupEmailRef}
                        label={t("auth.email")}
                        placeholder="you@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        textContentType="emailAddress"
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onFocus={() => ensureInputVisible("email")}
                        onSubmitEditing={() =>
                          signupPasswordRef.current?.focus()
                        }
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={signupErrors.email?.message}
                      />
                    </View>
                  )}
                />

                <Controller
                  control={signupControl}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      onLayout={(e) =>
                        setInputOffset("password", e.nativeEvent.layout.y)
                      }
                    >
                      <Input
                        ref={signupPasswordRef}
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
                        onSubmitEditing={() => signupConfirmRef.current?.focus()}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={signupErrors.password?.message}
                      />
                    </View>
                  )}
                />

                <Controller
                  control={signupControl}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      onLayout={(e) =>
                        setInputOffset("confirmPassword", e.nativeEvent.layout.y)
                      }
                    >
                      <Input
                        ref={signupConfirmRef}
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
                        error={signupErrors.confirmPassword?.message}
                      />
                    </View>
                  )}
                />

                <Button
                  variant="primary"
                  size="lg"
                  isLoading={signupLoading}
                  disabled={isGoogleLoading || signupCooldown}
                  onPress={handleSignupSubmit}
                >
                  Sign Up
                </Button>
              </>
            )}
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
                {(["light", "dark", "system"] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setMode(m)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor:
                        mode === m ? colors.primary : colors.cardBorder,
                      backgroundColor:
                        mode === m ? colors.secondary : colors.background,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {m === "light" && (
                      <Sun
                        size={16}
                        color={
                          mode === m ? colors.primary : colors.mutedForeground
                        }
                      />
                    )}
                    {m === "dark" && (
                      <Moon
                        size={16}
                        color={
                          mode === m ? colors.primary : colors.mutedForeground
                        }
                      />
                    )}
                    {m === "system" && (
                      <Smartphone
                        size={16}
                        color={
                          mode === m ? colors.primary : colors.mutedForeground
                        }
                      />
                    )}
                  </Pressable>
                ))}
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
                {(["pt", "en"] as const).map((lang) => {
                  const isActive =
                    lang === "pt" ? isPortuguese : !isPortuguese;
                  return (
                    <Pressable
                      key={lang}
                      onPress={() => {
                        void i18n.changeLanguage(lang);
                      }}
                      style={{
                        minWidth: 40,
                        height: 34,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: isActive
                          ? colors.primary
                          : colors.cardBorder,
                        backgroundColor: isActive
                          ? colors.secondary
                          : colors.background,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: isActive
                            ? colors.primary
                            : colors.mutedForeground,
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        {lang.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <Pressable onPress={() => showToast("Coming soon", "info")}>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 12,
                    textDecorationLine: "underline",
                  }}
                >
                  Terms of Service
                </Text>
              </Pressable>
              <Pressable onPress={() => showToast("Coming soon", "info")}>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 12,
                    textDecorationLine: "underline",
                  }}
                >
                  Privacy Policy
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
