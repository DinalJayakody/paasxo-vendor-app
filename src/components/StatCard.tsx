import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  sub?: string;
  accent?: string;
  delay?: number;
  style?: ViewStyle;
}

/** Animated stat tile with a count-up value, icon badge, and gradient accent bar. */
export default function StatCard({
  icon, label, value, prefix = '', suffix = '', decimals = 0, sub, accent: accentProp, delay = 0, style,
}: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const accent = accentProp ?? colors.primary;
  const animated = useCountUp(value);
  const formatted = decimals > 0
    ? animated.toFixed(decimals)
    : Math.round(animated).toLocaleString();

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(delay).springify()} style={[styles.card, style]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <View style={[styles.iconBadge, { backgroundColor: `${accent}1F` }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{prefix}{formatted}{suffix}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  accentBar: { width: 5 },
  body: { flex: 1, padding: spacing.md },
  iconBadge: {
    width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  label: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  value: { ...typography.h1, fontSize: 26, color: colors.text, marginTop: 2 },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
