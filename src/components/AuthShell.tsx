import React, { PropsWithChildren } from 'react';
import {
  View, Text, Image, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import GradientBackground from './GradientBackground';
import Mascot from './Mascot';

interface Props {
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
}

/** Shared light-gradient + still-mascot backdrop used by Login and Register.
 *  No FloatingOrbs and no animated mascot here — see the comment below on
 *  why continuous animation is avoided on this screen specifically. */
export default function AuthShell({ title, subtitle, footer, children }: PropsWithChildren<Props>) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <GradientBackground colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {/* "always", not "handled" — "handled" only forwards a touch to a
              child the ScrollView recognizes as already handling it (i.e.
              Touchable/Pressable, which is why the Sign In button always
              worked on the first tap). A bare TextInput isn't reliably
              recognized that way, so the ScrollView's own scroll responder
              was intercepting the touch instead of letting it reach the
              input — the field would flash briefly then never actually
              become focused. */}
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always">
            {/* Plain Views throughout, not Animated.View — any Reanimated
                entering/exiting (layout) animation on this screen, even on an
                unrelated sibling like the mascot or logo, forces a Fabric
                mount-commit when it finishes. That commit can recreate the
                native TextInput view that currently has focus, which drops
                focus and closes the keyboard — repeated taps race repeated
                commits until they finally settle. Login/Register need the
                keyboard to respond on the first tap more than they need a
                fade-in, so no layout animations live here at all. */}
            <View style={styles.mascotWrap}>
              <Mascot pose="wave" size={92} animated={false} />
            </View>

            <View style={styles.logoWrap}>
              <View style={styles.logoBadge}>
                <Image
                  source={require('../../assets/logo.jpeg')}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={styles.formCard}>
              {children}
            </View>

            {footer}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gradientStart },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  mascotWrap: { alignItems: 'center', marginBottom: -spacing.sm },
  logoWrap: { alignItems: 'center', marginBottom: spacing.lg },
  logoBadge: {
    width: 76, height: 76, borderRadius: radius.lg, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 8, borderWidth: 3, borderColor: colors.surface,
  },
  logoImage: { width: '100%', height: '100%' },
  title: { ...typography.h1, color: colors.text, letterSpacing: 0.2 },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  formCard: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
});
