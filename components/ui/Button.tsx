import { Pressable, Text, ActivityIndicator, type PressableProps } from 'react-native';
import { cn } from '@/lib/utils';

interface ButtonProps extends PressableProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}

const variantStyles = {
  primary: 'bg-primary-600 active:bg-primary-700',
  secondary: 'bg-light-surface dark:bg-dark-surface active:opacity-80',
  outline: 'border border-light-border dark:border-dark-border active:opacity-80',
  ghost: 'active:opacity-60',
  destructive: 'bg-red-500 active:bg-red-600',
};

const variantTextStyles = {
  primary: 'text-white font-semibold',
  secondary: 'text-gray-800 dark:text-gray-200',
  outline: 'text-gray-900 dark:text-gray-100',
  ghost: 'text-primary-600 dark:text-primary-400',
  destructive: 'text-white font-semibold',
};

const sizeStyles = {
  sm: 'px-3 py-2 rounded-lg',
  md: 'px-5 py-3 rounded-xl',
  lg: 'px-6 py-4 rounded-2xl',
};

const sizeTextStyles = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  textClassName,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(
        'flex-row items-center justify-center',
        variantStyles[variant],
        sizeStyles[size],
        (disabled || isLoading) && 'opacity-50',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'destructive' ? '#fff' : '#0ea5b0'}
        />
      ) : typeof children === 'string' ? (
        <Text className={cn(variantTextStyles[variant], sizeTextStyles[size], textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
