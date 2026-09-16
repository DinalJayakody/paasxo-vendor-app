import React, { PropsWithChildren } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import GradientBackground from './GradientBackground';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  /** Reduces vertical padding for a more compact banner (e.g. sub-pages). */
  compact?: boolean;
  style?: ViewStyle;
  /** Override the default blue hero gradient — e.g. paletteForRole('TRAINER') for Trainer screens. */
  heroColors?: [string, string, string];
}

/** Reusable primary-gradient hero header with rounded bottom corners, used atop every main screen. */
export default function ScreenHeader({
  title, subtitle, onBack, rightElement, compact, children, style, heroColors,
}: PropsWithChildren<Props>) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [gradStart, gradMid, gradEnd] = heroColors ?? [colors.heroStart, colors.heroMid, colors.heroEnd];

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm, backgroundColor: gradStart }, compact && styles.compact, style]}>
      <StatusBar style="light" />
      <GradientBackground colors={[gradStart, gradMid, gradEnd]} />
      <Animated.View entering={FadeInDown.duration(450).springify()}>
        <View style={styles.topRow}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}
          {rightElement}
        </View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.heroStart,
  },
  compact: { paddingBottom: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  backBtnPlaceholder: { width: 34, height: 34 },
  title: { ...typography.h1, fontSize: 26, color: colors.white, marginTop: spacing.sm },
  subtitle: { ...typography.body, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
});
