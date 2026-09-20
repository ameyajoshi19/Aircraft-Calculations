import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/design/theme';
import { typeScale, type Palette } from '@/design/tokens';

type Variant = keyof typeof typeScale;
type Tone = 'ink' | 'muted' | 'faint' | 'accent' | 'warning' | 'danger' | 'ok';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  /** Uppercases the content; implied by variant="label". */
  caps?: boolean;
}

const toneToColor: Record<Tone, keyof Palette> = {
  ink: 'ink',
  muted: 'muted',
  faint: 'faint',
  accent: 'accent',
  warning: 'warning',
  danger: 'danger',
  ok: 'ok',
};

export function Text({ variant = 'body', tone = 'ink', caps, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const isCaps = caps ?? variant === 'label';

  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant],
        { color: colors[toneToColor[tone]] },
        isCaps && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}
