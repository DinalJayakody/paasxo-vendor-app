import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenHeader from '@/components/ScreenHeader';
import ScreenGlow from '@/components/ScreenGlow';

/**
 * No raw card capture here — collecting card numbers/CVC client-side without
 * a PCI-compliant tokenizing SDK is unsafe, and a paid Pro tier that unlocks
 * in-app features must go through Apple/Google in-app purchase (App Store
 * Guideline 3.1.1), not a custom checkout form. Until IAP is wired up, this
 * screen is an honest "not yet available" placeholder instead of a fake
 * payment flow — see VendorApi.checkoutSubscription (unused now) for the
 * old form this replaced.
 */
export default function SubscriptionScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader title="Subscription" subtitle="Upgrade your vendor plan" onBack={() => navigation.goBack()} compact />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInUp.duration(450).springify()}>
          <Card>
            <View style={styles.planBanner}>
              <View>
                <Text style={styles.planName}>Pro Plan</Text>
                <Text style={styles.planSub}>Monthly Billing</Text>
              </View>
              <Text style={styles.planPrice}>LKR 29.00</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={16} color={colors.primary} />
              <Text style={styles.infoText}>
                Paasxo Venue Admin includes all staff management and booking analytics features.
              </Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(80).springify()}>
          <Card style={styles.comingSoonCard}>
            <Ionicons name="rocket-outline" size={28} color={colors.primary} />
            <Text style={styles.comingSoonTitle}>Pro upgrades aren't open yet</Text>
            <Text style={styles.comingSoonText}>
              We're finishing subscriptions so upgrades go through your App Store or Play Store account,
              the same secure way every purchase does. Reach out and we'll notify you the moment it's ready.
            </Text>
          </Card>
        </Animated.View>

        <PrimaryButton
          title="Contact Support"
          icon="mail-outline"
          onPress={() => Linking.openURL('mailto:support@paasxo.com?subject=Pro%20Plan%20Interest')}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  planBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  planName: { fontWeight: '800', fontSize: 18, color: colors.primaryDark },
  planSub: { color: colors.textMuted, fontSize: 13 },
  planPrice: { fontWeight: '800', fontSize: 20, color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.sm,
  },
  infoText: { color: colors.primaryDark, fontSize: 13, flex: 1 },
  comingSoonCard: { marginTop: spacing.md, alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  comingSoonTitle: { ...typography.h3, color: colors.text, textAlign: 'center' },
  comingSoonText: { color: colors.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 19 },
});
