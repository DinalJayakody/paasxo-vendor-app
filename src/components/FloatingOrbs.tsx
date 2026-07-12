import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface OrbConfig {
  size: number;
  color: string;
  top: number;
  left?: number;
  right?: number;
  opacity: number;
  driftY: number;
  driftX: number;
  duration: number;
}

function buildOrbs(width: number, height: number, colors: string[]): OrbConfig[] {
  return [
    { size: height * 0.6, color: colors[0], top: -height * 0.16, left: -width * 0.16, opacity: 0.35, driftY: 16, driftX: 10, duration: 5200 },
    { size: height * 0.45, color: colors[1] ?? colors[0], top: height * 0.22, right: -width * 0.13, opacity: 0.28, driftY: -14, driftX: -12, duration: 6400 },
    { size: height * 0.36, color: colors[2] ?? colors[0], top: height * 0.55, left: -width * 0.08, opacity: 0.22, driftY: 12, driftX: 14, duration: 4800 },
    { size: height * 0.24, color: colors[0], top: height * 0.75, right: width * 0.18, opacity: 0.3, driftY: -10, driftX: 8, duration: 5600 },
  ];
}

const DEFAULT_COLORS = ['#3B82F6', '#7C3AED', '#06B6D4'];

function Orb({ config }: { config: OrbConfig }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(config.driftY, { duration: config.duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: config.duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    translateX.value = withRepeat(
      withSequence(
        withTiming(config.driftX, { duration: config.duration * 1.15, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: config.duration * 1.15, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        animatedStyle,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity: config.opacity,
          top: config.top,
          left: config.left,
          right: config.right,
        },
      ]}
    />
  );
}

interface Props {
  /** Defaults to full window size — pass a smaller height/width to embed inside a compact hero banner. */
  width?: number;
  height?: number;
  colors?: string[];
}

/** Soft, slowly-drifting blurred-look orbs used as a premium, alive backdrop — full-screen or embedded in a banner. */
export default function FloatingOrbs({ width = SCREEN_W, height = SCREEN_H, colors = DEFAULT_COLORS }: Props) {
  const orbs = useMemo(() => buildOrbs(width, height, colors), [width, height, colors]);
  return (
    <>
      {orbs.map((orb, i) => (
        <Orb key={i} config={orb} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
});
