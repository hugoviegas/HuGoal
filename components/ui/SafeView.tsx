import React from 'react';
import { View, Text, type ViewProps } from 'react-native';

interface SafeViewProps extends ViewProps {
  className?: string;
  children?: React.ReactNode;
}

function wrapChild(child: unknown, key?: number): React.ReactNode {
  if (child === null || child === undefined) return null;
  if (typeof child === 'string' || typeof child === 'number') {
    return <Text key={key}>{String(child)}</Text>;
  }
  if (Array.isArray(child)) {
    return child.map((c, i) => wrapChild(c, i));
  }
  return child as React.ReactNode;
}

export function SafeView({ children, ...props }: SafeViewProps) {
  const wrapped = wrapChild(children as unknown);
  return <View {...props}>{wrapped}</View>;
}

export default SafeView;
