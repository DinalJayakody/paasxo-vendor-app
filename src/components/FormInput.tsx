import React, { useState } from 'react';
import { TextInput, TextInputProps, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

interface Props extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  error?: boolean;
}

/**
 * Light, rounded input with a leading icon and animated focus ring, used
 * across the app's forms.
 *
 * The focus ring is driven by a Reanimated shared value mutated directly on
 * the UI thread (onFocus/onBlur just set `focused.value`, no `setState`) —
 * not by React state. A React state update here would re-render and commit
 * the wrapping View on every focus/blur, and on the New Architecture that
 * commit can happen inside the very same event that just gave the TextInput
 * focus, recreating its native view and immediately dropping the focus it
 * was just granted. Keeping the highlight UI-thread-only avoids that commit
 * entirely, the same way PrimaryButton's press animation never re-renders.
 */
export default function FormInput({ icon, isPassword, error, style, onFocus, onBlur, ...rest }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const focused = useSharedValue(0);

  const animatedWrapStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focused.value, [0, 1], [colors.border, colors.primary]),
    backgroundColor: interpolateColor(focused.value, [0, 1], [colors.primarySoft, colors.surface]),
  }));

  return (
    <Animated.View style={[styles.wrap, animatedWrapStyle, error && styles.wrapError]}>
      <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.icon} />
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={isPassword && !visible}
        onFocus={(e) => {
          focused.value = withTiming(1, { duration: 150 });
          onFocus?.(e);
        }}
        onBlur={(e) => {
          focused.value = withTiming(0, { duration: 150 });
          onBlur?.(e);
        }}
        {...rest}
      />
      {isPassword && (
        <TouchableOpacity onPress={() => setVisible((v) => !v)} hitSlop={10}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  wrapError: {
    borderColor: colors.danger,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
});
