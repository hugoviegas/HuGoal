import { Image, View, Text } from 'react-native';
import { cn } from '@/lib/utils';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

const textSizeMap = {
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
};

export function Avatar({ uri, name, size = 'md', className }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        className={cn('rounded-full', sizeMap[size], className)}
      />
    );
  }

  return (
    <View
      className={cn(
        'rounded-full bg-primary-600 items-center justify-center',
        sizeMap[size],
        className
      )}
    >
      <Text className={cn('text-white font-bold', textSizeMap[size])}>{initials}</Text>
    </View>
  );
}
