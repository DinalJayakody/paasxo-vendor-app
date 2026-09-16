import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import GradientBackground from '@/components/GradientBackground';
import Mascot from '@/components/Mascot';
import PrimaryButton from '@/components/PrimaryButton';

/**
 * Shown right after a vendor submits Register — their account was created
 * but is inactive until Paasxo ops manually verifies the Excel details
 * emailed to them (see AuthService#register / VendorRegistrationEmailService)
 * and activates them from the Admin console. There is nothing to sign into
 * yet, so this screen replaces (not follows) the auth stack — see
 * RegisterScreen's navigation.reset to 'PendingVerification'.
 */
export default function PendingVerificationScreen({ navigation }: any) {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <GradientBackground colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]} />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.mascotWrap}>
            <Mascot pose="sit" size={110} animated />
          </View>

          <View style={styles.card}>
            <View style={styles.badge}>
              <Ionicons name="time-outline" size={30} color={colors.warning} />
            </View>

            <Text style={styles.title}>Verification in progress</Text>
            <Text style={styles.body}>
              Thanks for registering with Paasxo! We've received your vendor details and
              our operations team is reviewing them now.
            </Text>
            <Text style={styles.body}>
              Someone from Paasxo will be in touch shortly to complete your verification.
              Once approved, you'll be able to sign in with the email and password you
              just created.
            </Text>

            <View style={styles.stepsCard}>
              <StepRow colors={colors} icon="mail-outline" text="Your details were sent to our operations team" done />
              <StepRow colors={colors} icon="hourglass-outline" text="Manual verification in progress" active />
              <StepRow colors={colors} icon="checkmark-circle-outline" text="Account activated — you can sign in" />
            </View>

            <PrimaryButton
              title="Back to Sign In"
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StepRow({
  colors, icon, text, done, active,
}: {
  colors: ThemeColors;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  done?: boolean;
  active?: boolean;
}) {
  const tint = done ? colors.success : active ? colors.warning : colors.textMuted;
  return (
    <View style={stepStyles.row}>
      <View style={[stepStyles.iconWrap, { backgroundColor: done ? colors.successLight : active ? colors.warningLight : colors.primarySoft }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={[stepStyles.text, { color: active ? colors.text : colors.textMuted, fontWeight: active ? '700' : '500' }]}>
        {text}
      </Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: 13 },
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gradientStart },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  mascotWrap: { alignItems: 'center', marginBottom: -spacing.sm },
  card: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  badge: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.warningLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h1, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
  stepsCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
});
