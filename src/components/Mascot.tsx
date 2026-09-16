import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Ellipse, Circle, Path, G } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';

const AnimatedG = Animated.createAnimatedComponent(G);

export type MascotPose = 'wave' | 'cheer' | 'sit' | 'trophy';

interface Props {
  pose?: MascotPose;
  size?: number;
  style?: ViewStyle;
  /** [light, mid, dark] override — defaults to the blue Vendor palette. Pass the orange Trainer trio for role-flavored screens. */
  accentColors?: [string, string, string];
  /** Set false to render a still frame with no looping UI-thread animation —
   *  e.g. on the Login/Register screen, where every bit of continuous main-
   *  thread work competes with the keyboard-focus handshake right as the
   *  screen appears. Defaults true everywhere else. */
  animated?: boolean;
}

/** Hand-drawn friendly mascot (SVG shapes, no external image assets) used on auth screens and empty states. */
export default function Mascot({ pose = 'wave', size = 140, style, accentColors, animated = true }: Props) {
  const { colors } = useTheme();
  const [bodyLight, bodyMid, bodyDark] = accentColors ?? [colors.primaryLight, colors.primary, colors.primaryDark];
  const bob = useSharedValue(0);
  const wave = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    if (pose === 'wave') {
      wave.value = withRepeat(
        withSequence(
          withTiming(18, { duration: 420, easing: Easing.inOut(Easing.quad) }),
          withTiming(-8, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    }
  }, [pose, animated]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));

  const armProps = useAnimatedProps(() => ({
    rotation: wave.value,
  }));

  const showRaisedArm = pose === 'wave' || pose === 'cheer';

  return (
    <Animated.View style={[{ width: size, height: size }, bobStyle, style]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="mascotBody" x1="20%" y1="0%" x2="90%" y2="100%">
            <Stop offset="0%" stopColor={bodyLight} />
            <Stop offset="55%" stopColor={bodyMid} />
            <Stop offset="100%" stopColor={bodyDark} />
          </LinearGradient>
        </Defs>

        <Ellipse cx={78} cy={180} rx={15} ry={8} fill={colors.primaryDarker} opacity={0.85} />
        <Ellipse cx={124} cy={180} rx={15} ry={8} fill={colors.primaryDarker} opacity={0.85} />

        <Path d="M42 118 Q22 132 30 158" stroke="url(#mascotBody)" strokeWidth={16} strokeLinecap="round" fill="none" />

        <Ellipse cx={101} cy={116} rx={64} ry={60} fill="url(#mascotBody)" />
        <Ellipse cx={76} cy={90} rx={16} ry={10} fill={colors.white} opacity={0.22} />

        {showRaisedArm ? (
          <AnimatedG origin="150,104" animatedProps={armProps}>
            <Path d="M150 104 Q176 84 172 56" stroke="url(#mascotBody)" strokeWidth={16} strokeLinecap="round" fill="none" />
            <Circle cx={172} cy={54} r={11} fill={colors.primaryLight} />
          </AnimatedG>
        ) : (
          <Path d="M158 120 Q182 130 176 156" stroke="url(#mascotBody)" strokeWidth={16} strokeLinecap="round" fill="none" />
        )}

        {pose === 'trophy' && (
          <>
            <Path d="M86 58 h30 v6 h-30 z" fill={colors.premium} />
            <Path d="M92 64 h18 v10 a9 9 0 0 1 -18 0 z" fill={colors.premium} />
            <Path d="M96 82 h10 v8 h-10 z" fill={colors.premium} />
          </>
        )}

        <Ellipse cx={80} cy={110} rx={13} ry={15} fill={colors.white} />
        <Ellipse cx={122} cy={110} rx={13} ry={15} fill={colors.white} />
        <Circle cx={83} cy={114} r={6} fill={colors.primaryDarker} />
        <Circle cx={125} cy={114} r={6} fill={colors.primaryDarker} />
        <Circle cx={85} cy={111} r={1.8} fill={colors.white} />
        <Circle cx={127} cy={111} r={1.8} fill={colors.white} />

        <Ellipse cx={66} cy={132} rx={8} ry={5} fill="#F59BAE" opacity={0.55} />
        <Ellipse cx={136} cy={132} rx={8} ry={5} fill="#F59BAE" opacity={0.55} />

        <Path d="M82 138 Q101 154 120 138" stroke={colors.primaryDarker} strokeWidth={4.5} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}
