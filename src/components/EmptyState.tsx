import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import Mascot, { MascotPose } from './Mascot';
import PrimaryButton from './PrimaryButton';

interface Props {
  title: string;
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
  pose?: MascotPose;
  style?: ViewStyle;
}

/** Friendly empty-state block (mascot + copy + optional CTA) used across list screens. */
export default function EmptyState({ title, message, ctaLabel, onCta, pose = 'sit', style }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <Animated.View entering={FadeInUp.duration(500).springify()} style={[styles.wrap, style]}>
      <Mascot pose={pose} size={120} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {ctaLabel && onCta ? (
        <PrimaryButton title={ctaLabel} onPress={onCta} style={styles.cta} />
      ) : null}
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  title: { ...typography.h3, color: colors.text, marginTop: spacing.sm, textAlign: 'center' },
  message: { ...typography.body, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  cta: { marginTop: spacing.lg, minWidth: 180 },
});
