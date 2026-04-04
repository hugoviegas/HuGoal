import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { setDocument } from '@/lib/firestore';
import { useThemeStore } from '@/stores/theme.store';
import { useToastStore } from '@/stores/toast.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import type { UserProfile } from '@/types';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupForm = z.infer<typeof schema>;

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(cred.user, { displayName: data.name });
      await sendEmailVerification(cred.user);

      const profile: Omit<UserProfile, 'id'> = {
        email: data.email,
        name: data.name,
        allergies: [],
        dietary_restrictions: [],
        preferred_cuisines: [],
        xp: 0,
        streak_current: 0,
        streak_longest: 0,
        onboarding_complete: false,
        created_at: new Date().toISOString(),
      };
      await setDocument('profiles', cred.user.uid, profile);

      setEmailSent(true);
    } catch (e: any) {
      const msg =
        e?.code === 'auth/email-already-in-use' ? 'An account with this email already exists.'
        : e?.code === 'auth/network-request-failed' ? 'Network error. Check your connection.'
        : e?.message ?? t('common.error');
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, backgroundColor: colors.background }}
      >
        <Text style={{ fontSize: 42, marginBottom: 16 }}>📬</Text>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.foreground, textAlign: 'center', marginBottom: 12 }}>
          Check your email
        </Text>
        <Text style={{ fontSize: 16, color: colors.mutedForeground, textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
          We sent a verification link. Open it to activate your account, then sign in.
        </Text>
        <Button variant="primary" size="lg" onPress={() => router.replace('/(auth)/login')} className="w-full">
          Go to Sign In
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={{ marginBottom: 32, padding: 4, alignSelf: 'flex-start', marginLeft: -8 }}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>

        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.foreground, marginBottom: 6 }}>
          {t('auth.signup')}
        </Text>
        <Text style={{ fontSize: 16, color: colors.mutedForeground, marginBottom: 32 }}>
          Create your BetterU account
        </Text>

        <View style={{ gap: 16 }}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('onboarding.name')}
                placeholder="Your full name"
                autoComplete="name"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.name?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.email')}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
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
                label={t('auth.password')}
                placeholder="••••••••"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.confirm_password')}
                placeholder="••••••••"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Button variant="primary" size="lg" isLoading={loading} onPress={handleSubmit(onSubmit)} className="mt-2">
            {t('auth.signup')}
          </Button>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
            <Text style={{ color: colors.mutedForeground }}>{t('auth.have_account')} </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('auth.login')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
