import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useToastStore } from '@/stores/toast.store';
import { X } from 'lucide-react-native';

const typeColors = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  warning: 'bg-yellow-600',
  info: 'bg-primary-600',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={{ top: insets.top + 8 }}
      className="absolute left-4 right-4 z-50 gap-2"
    >
      {toasts.map((toast) => (
        <Animated.View
          key={toast.id}
          entering={FadeInUp.springify()}
          exiting={FadeOutUp.springify()}
          className={`flex-row items-center justify-between rounded-xl px-4 py-3 ${typeColors[toast.type]}`}
        >
          <Text className="flex-1 text-sm font-medium text-white">{toast.message}</Text>
          <Pressable onPress={() => dismiss(toast.id)} className="ml-2 p-1">
            <X size={16} color="#fff" />
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}
