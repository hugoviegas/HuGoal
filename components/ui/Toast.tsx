import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
} from 'react-native-reanimated';
import { useToastStore } from '@/stores/toast.store';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
} from 'lucide-react-native';
import { useThemeStore } from '@/stores/theme.store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

const positionLayout: Record<
  ToastPosition,
  {
    alignItems: 'flex-start' | 'center' | 'flex-end';
    entering: typeof FadeInUp;
    exiting: typeof FadeOutUp;
  }
> = {
  'top-left': {
    alignItems: 'flex-start',
    entering: FadeInDown,
    exiting: FadeOutUp,
  },
  'top-center': {
    alignItems: 'center',
    entering: FadeInDown,
    exiting: FadeOutUp,
  },
  'top-right': {
    alignItems: 'flex-end',
    entering: FadeInDown,
    exiting: FadeOutUp,
  },
  'bottom-left': {
    alignItems: 'flex-start',
    entering: FadeInUp,
    exiting: FadeOutDown,
  },
  'bottom-center': {
    alignItems: 'center',
    entering: FadeInUp,
    exiting: FadeOutDown,
  },
  'bottom-right': {
    alignItems: 'flex-end',
    entering: FadeInUp,
    exiting: FadeOutDown,
  },
};

const typeStyles = {
  success: {
    border: '#16a34a33',
    icon: '#16a34a',
    title: 'text-green-700 dark:text-green-400',
  },
  error: {
    border: '#ef444433',
    icon: '#ef4444',
    title: 'text-red-700 dark:text-red-400',
  },
  warning: {
    border: '#d9770633',
    icon: '#d97706',
    title: 'text-amber-700 dark:text-amber-400',
  },
  info: {
    border: '#0ea5b033',
    icon: '#0ea5b0',
    title: 'text-gray-900 dark:text-gray-100',
  },
};

const typeIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  const renderToast = (toast: (typeof toasts)[number]) => {
    const layout = positionLayout[toast.position];
    const Icon = typeIcons[toast.type];
    const highlightTitle = toast.highlightTitle
      ? 'text-primary-600 dark:text-primary-400'
      : typeStyles[toast.type].title;

    return (
      <Animated.View
        key={toast.id}
        entering={layout.entering.springify()}
        exiting={layout.exiting.springify()}
        className="w-full max-w-[520px]"
      >
        <View
          className={cn('rounded-2xl border px-4 py-3 shadow-lg')}
          style={{
            backgroundColor: colors.card,
            borderColor: typeStyles[toast.type].border,
            shadowColor: colors.foreground,
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
          }}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-row flex-1 items-start gap-3">
              <Icon size={18} color={typeStyles[toast.type].icon} />

              <View className="flex-1 gap-1">
                {toast.title ? (
                  <Text className={cn('text-sm font-semibold', highlightTitle)}>
                    {toast.title}
                  </Text>
                ) : null}
                <Text className="text-sm text-gray-700 dark:text-gray-300">
                  {toast.message}
                </Text>

                {toast.action ? (
                  (() => {
                    const actionVariant =
                      toast.action?.variant === 'default'
                        ? 'primary'
                        : toast.action?.variant ?? 'outline';

                    return (
                  <Button
                    variant={actionVariant}
                    size="sm"
                    onPress={() => {
                      toast.action?.onPress();
                      dismiss(toast.id);
                    }}
                    className={cn('mt-3 self-start')}
                    textClassName={cn(
                      toast.type === 'success'
                        ? 'text-green-600 dark:text-green-400'
                        : toast.type === 'error'
                          ? 'text-red-600 dark:text-red-400'
                          : toast.type === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-900 dark:text-gray-100',
                    )}
                  >
                    {toast.action.label}
                  </Button>
                    );
                  })()
                ) : null}
              </View>
            </View>

            <Pressable onPress={() => dismiss(toast.id)} className="ml-2 mt-0.5 p-1">
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  const topToasts = toasts.filter((toast) => toast.position.startsWith('top'));
  const bottomToasts = toasts.filter((toast) => toast.position.startsWith('bottom'));

  return (
    <View pointerEvents="box-none" className="absolute inset-0 z-50">
      {topToasts.length > 0 ? (
        <View
          pointerEvents="box-none"
          style={{ top: insets.top + 12, left: 16, right: 16, alignItems: 'center' }}
          className="absolute gap-3"
        >
          {topToasts.map((toast) => (
            <View
              key={toast.id}
              style={{ width: '100%', alignItems: positionLayout[toast.position].alignItems }}
            >
              {renderToast(toast)}
            </View>
          ))}
        </View>
      ) : null}

      {bottomToasts.length > 0 ? (
        <View
          pointerEvents="box-none"
          style={{ bottom: insets.bottom + 12, left: 16, right: 16, alignItems: 'center' }}
          className="absolute gap-3"
        >
          {bottomToasts.map((toast) => (
            <View
              key={toast.id}
              style={{ width: '100%', alignItems: positionLayout[toast.position].alignItems }}
            >
              {renderToast(toast)}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
