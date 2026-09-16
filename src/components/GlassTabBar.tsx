import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

const NAV_CONTENT_HEIGHT = Platform.OS === 'ios' ? 64 : 68;
const NAV_PILL_GAP = Platform.OS === 'ios' ? 12 : 10;

/** Total on-screen footprint of <GlassTabBar/> on this device. Unlike the
 *  navigator's old flat `tabBarStyle` bar, this floating pill is absolutely
 *  positioned and reports no height to Tab.Navigator's own layout — screens
 *  must pad their own scrollable content's bottom by this amount so the last
 *  bit of content isn't hidden behind the floating bar. */
export function useGlassTabBarHeight() {
  const insets = useSafeAreaInsets();
  return NAV_CONTENT_HEIGHT + NAV_PILL_GAP + insets.bottom + 12;
}

interface GlassTabBarProps extends BottomTabBarProps {
  /** Active-tab tint — role-aware (blue for vendors, orange for trainers via
   *  useRoleTheme()), passed in by the Tab.Navigator that owns this bar. */
  activeTintColor: string;
}

/** Floating rounded glass pill bottom tab bar — mirrors the sibling User
 *  App's `BottomNavbar.tsx` (blur + brand-blue gradient tint, spring
 *  scale-down per item on press). Plugged in via `Tab.Navigator`'s `tabBar`
 *  render prop instead of `tabBarStyle`, since matching that exact floating/
 *  glass/gradient look needs full control over the bar's own layout, not
 *  just style overrides on the default flat bar. */
export default function GlassTabBar({ state, descriptors, navigation, activeTintColor }: GlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + NAV_PILL_GAP }]} pointerEvents="box-none">
      <View style={[styles.pill, { height: NAV_CONTENT_HEIGHT }]}>
        {/* Clipped separately from `pill` itself — a view can't both clip its
            content (needed to round the blur's square corners) and cast its
            own drop shadow, so the shadow lives on `pill` and the clipping
            lives on this absolutely-filled inner layer instead. */}
        <View style={styles.pillClip} pointerEvents="none">
          <BlurView
            intensity={Platform.OS === 'ios' ? 50 : 80}
            tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <Svg style={StyleSheet.absoluteFillObject}>
            <Defs>
              <SvgLinearGradient id="tabBarTint" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.15} />
                <Stop offset="50%" stopColor={colors.primaryDark} stopOpacity={0.12} />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity={0.15} />
              </SvgLinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill="url(#tabBarTint)" />
          </Svg>
        </View>

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label = (options.title ?? route.name) as string;
          const color = isFocused ? activeTintColor : colors.textMuted;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              icon={options.tabBarIcon?.({ focused: isFocused, color, size: 22 }) ?? null}
              label={label}
              active={isFocused}
              color={color}
              styles={styles}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  onPress,
  onLongPress,
  icon,
  label,
  active,
  color,
  styles,
}: {
  onPress: () => void;
  onLongPress: () => void;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={styles.itemTouchable}
      android_ripple={{ color: color + '30', borderless: true, radius: 28 }}
    >
      <Animated.View style={[styles.item, { transform: [{ scale }] }]}>
        {active && <View style={[styles.itemActiveDot, { backgroundColor: color }]} />}
        {icon}
        <Text style={[styles.label, { color }, active && styles.labelActive]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 6,
    shadowColor: colors.primaryDarker,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  pillClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: 'hidden',
  },
  itemTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  itemActiveDot: {
    position: 'absolute',
    top: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  labelActive: {
    fontWeight: '800',
  },
});
