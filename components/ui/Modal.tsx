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
          <View
            style={{
              marginHorizontal: 24,
              maxWidth: 384,
              borderRadius: 16,
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isDark ? 0.35 : 0.15,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            {children}
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
