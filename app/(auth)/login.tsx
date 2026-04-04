import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useThemeStore } from '@/stores/theme.store';
import { useToastStore } from '@/stores/toast.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useThemeStore((s) => s.colors);
  const showToast = useToastStore((s) => s.show);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // Auth store listener handles redirect
    } catch (e: any) {
      const msg =
        e?.code === 'auth/user-not-found' ? 'No account found with this email.'
        : e?.code === 'auth/wrong-password' ? 'Incorrect password.'
        : e?.code === 'auth/network-request-failed' ? 'Network error. Check your connection.'
        : e?.message ?? t('common.error');
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

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
          {t('auth.login')}
        </Text>
        <Text style={{ fontSize: 16, color: colors.mutedForeground, marginBottom: 32 }}>
          Welcome back
        </Text>

        <View style={{ gap: 16 }}>
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

          <Button
            variant="primary"
            size="lg"
            isLoading={loading}
            onPress={handleSubmit(onSubmit)}
            className="mt-2"
          >
            {t('auth.login')}
          </Button>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
            <Text style={{ color: colors.mutedForeground }}>{t('auth.no_account')} </Text>
            <Pressable onPress={() => router.replace('/(auth)/signup')}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('auth.signup')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
