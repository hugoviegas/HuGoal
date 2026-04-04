import { TextInput, View, Text, type TextInputProps } from 'react-native';
import { useThemeStore } from '@/stores/theme.store';
import { cn } from '@/lib/utils';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function Input({ label, error, containerClassName, className, ...props }: InputProps) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      )}
      <TextInput
        className={cn(
          'rounded-xl border px-4 py-3 text-base',
          error
            ? 'border-red-500'
            : 'border-light-border dark:border-dark-border',
          'bg-light-surface dark:bg-dark-surface',
          'text-gray-900 dark:text-gray-100',
          className
        )}
        placeholderTextColor={colors.muted}
        {...props}
      />
      {error && <Text className="text-sm text-red-500">{error}</Text>}
    </View>
  );
}
