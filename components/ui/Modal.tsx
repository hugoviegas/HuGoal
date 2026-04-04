import { Modal as RNModal, View, Pressable, type ModalProps as RNModalProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { useThemeStore } from '@/stores/theme.store';

interface ModalProps extends Omit<RNModalProps, 'children'> {
  children: React.ReactNode;
  onClose: () => void;
}

export function Modal({ children, onClose, ...props }: ModalProps) {
  const isDark = useThemeStore((s) => s.isDark);

  return (
    <RNModal transparent animationType="fade" {...props}>
      <Pressable
        className="flex-1 items-center justify-center"
        onPress={onClose}
      >
        <BlurView
          intensity={40}
          tint={isDark ? 'dark' : 'light'}
          className="absolute inset-0"
        />
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View className="mx-6 w-full max-w-sm rounded-2xl bg-light-card dark:bg-dark-card p-6 shadow-xl">
            {children}
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
