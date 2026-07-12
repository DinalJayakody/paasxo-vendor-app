import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '@/theme';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import FormInput from '@/components/FormInput';
import ScreenHeader from '@/components/ScreenHeader';
import { VendorApi } from '@/api/vendor';

const METHODS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'CARD', label: 'Credit / Debit Card', icon: 'card-outline' },
  { key: 'GOOGLE_PAY', label: 'Google Pay', icon: 'logo-google' },
  { key: 'APPLE_PAY', label: 'Apple Pay', icon: 'logo-apple' },
];

/** Matches the reference "Subscription" order-summary + payment screen. */
export default function SubscriptionScreen({ navigation }: any) {
  const [method, setMethod] = useState('CARD');
  const [cardholder, setCardholder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const mutation = useMutation({
    mutationFn: () => VendorApi.checkoutSubscription({ planType: 'PRO', paymentMethod: method, cardholderName: cardholder }),
    onSuccess: () => {
      Alert.alert('Payment successful', 'Your Pro Plan is now active.');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Payment failed', e?.response?.data?.message ?? 'Please try again'),
  });

  return (
    <View style={styles.safe}>
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
            <View style={styles.rowBetween}>
              <Text style={styles.muted}>Subtotal</Text>
              <Text style={styles.muted}>LKR 29.00</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.muted}>Tax (0%)</Text>
              <Text style={styles.muted}>LKR 0.00</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.rowBetween}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>LKR 29.00</Text>
            </View>
            <View style={styles.infoBox}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.infoText}>
                Paasxo Venue Admin includes all staff management and booking analytics features.
              </Text>
            </View>
          </Card>
        </Animated.View>

        <Text style={styles.sectionHeading}>Payment Method</Text>
        {METHODS.map((m, index) => {
          const active = method === m.key;
          return (
            <Animated.View key={m.key} entering={FadeInUp.duration(400).delay(80 + index * 60).springify()}>
              <TouchableOpacity
                style={[styles.methodCard, active && styles.methodCardActive]}
                onPress={() => setMethod(m.key)}
                activeOpacity={0.8}
              >
                <View style={[styles.methodIcon, active && styles.methodIconActive]}>
                  <Ionicons name={m.icon} size={18} color={active ? colors.white : colors.primary} />
                </View>
                <Text style={styles.methodText}>{m.label}</Text>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? colors.primary : colors.border}
                />
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {method === 'CARD' && (
          <Animated.View entering={FadeInUp.duration(400).springify()}>
            <FormInput icon="person-outline" placeholder="Cardholder Name" value={cardholder} onChangeText={setCardholder} />
            <FormInput icon="card-outline" placeholder="0000 0000 0000 0000" keyboardType="number-pad" value={cardNumber} onChangeText={setCardNumber} />
            <View style={styles.rowGap}>
              <FormInput icon="calendar-outline" placeholder="MM/YY" value={expiry} onChangeText={setExpiry} style={{ flex: 1 }} />
              <FormInput icon="lock-closed-outline" placeholder="CVC" keyboardType="number-pad" value={cvc} onChangeText={setCvc} style={{ flex: 1 }} />
            </View>
          </Animated.View>
        )}

        <PrimaryButton
          title="Complete Payment"
          icon="lock-closed"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          style={{ marginTop: spacing.md }}
        />
        <View style={styles.secureRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
          <Text style={styles.secureText}>Your transaction is secured with 256-bit SSL encryption</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  planBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  planName: { fontWeight: '800', fontSize: 18, color: colors.primaryDark },
  planSub: { color: colors.textMuted, fontSize: 13 },
  planPrice: { fontWeight: '800', fontSize: 20, color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  muted: { color: colors.textMuted },
  totalLabel: { fontWeight: '800', fontSize: 18, color: colors.primary },
  totalValue: { fontWeight: '800', fontSize: 22, color: colors.primary },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.md,
  },
  infoText: { color: colors.primaryDark, fontSize: 13, flex: 1 },
  sectionHeading: { ...typography.h3, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, backgroundColor: colors.surface,
  },
  methodCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  methodIcon: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  methodIconActive: { backgroundColor: colors.primary },
  methodText: { flex: 1, fontWeight: '700', color: colors.text },
  rowGap: { flexDirection: 'row', gap: spacing.sm },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: spacing.sm },
  secureText: { textAlign: 'center', color: colors.textMuted, fontSize: 12 },
});
