import { Text, type TextProps } from 'react-native';

import { Type, type ThemeColor, type TypeVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  variant?: TypeVariant;
  color?: ThemeColor;
};

export function ThemedText({ style, variant = 'body', color = 'ink', ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return <Text style={[Type[variant], { color: theme[color] }, style]} {...rest} />;
}
