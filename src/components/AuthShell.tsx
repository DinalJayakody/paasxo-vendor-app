import React, { PropsWithChildren } from 'react';
import {
  View, Text, Image, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '@/theme';
import GradientBackground from './GradientBackground';
import FloatingOrbs from './FloatingOrbs';
import Mascot from './Mascot';

interface Props {
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
}

/** Shared light-gradient + floating-orb + mascot backdrop used by Login and Register. */
export default function AuthShell({ title, subtitle, footer, children }: PropsWithChildren<Props>) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <GradientBackground colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]} />
      <FloatingOrbs colors={[colors.orb1, colors.orb2, colors.orb3]} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Animated.View entering={FadeIn.duration(500).delay(80)} style={styles.mascotWrap}>
              <Mascot pose="wave" size={92} />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.logoWrap}>
              <View style={styles.logoBadge}>
                <Image
                  source={require('../../assets/logo.jpeg')}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(650).delay(120).springify()} style={styles.formCard}>
              {children}
            </Animated.View>

            {footer}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
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
