import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/Card';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { useAuthStore } from '@/store/authStore';
import ScreenHeader from '@/components/ScreenHeader';
import ScreenGlow from '@/components/ScreenGlow';
import { VendorApi } from '@/api/vendor';

/**
 * Where a vendor tells Paasxo which bank account their payouts should be
 * wired to. This is a v1 ledger-only payout system (see PaymentsScreen's own
 * guide copy) — an admin manually wires the money after confirming these
 * details, there's no automated bank transfer yet, so accuracy here matters.
 */
export default function BankAccountScreen({ navigation }: any) {
  const isTrainer = useAuthStore((st) => st.user?.accountType) === 'TRAINER';
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const { data: existing, isLoading } = useQuery({ queryKey: ['vendor-bank-account'], queryFn: VendorApi.bankAccount });

  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    if (existing) {
      setBankName(existing.bankName);
      setBranchName(existing.branchName);
      setAccountHolderName(existing.accountHolderName);
      // Never prefilled with a real number — accountNumberMasked only ever shows
      // the last 4 digits (see VendorBankAccountController). Re-entering the full
      // number is required to change it.
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: () => VendorApi.saveBankAccount({ bankName, branchName, accountHolderName, accountNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-bank-account'] });
      Alert.alert('Saved', 'Your payout bank account details have been saved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Could not save', err?.response?.data?.message ?? 'Please check your details and try again.');
    },
  });

  const canSave = bankName.trim() && branchName.trim() && accountHolderName.trim() && accountNumber.trim().length >= 4;

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader title="Payout Bank Account" subtitle="Where your settlement payouts are sent" compact onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.guideCard}>
          <View style={styles.guideRow}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Text style={styles.guideText}>
              {isTrainer
                ? 'For each session booking and plan sale, Paasxo holds the payment safely until the refund window ends, then settles your share (minus Paasxo\'s platform fee) as a payout.'
                : 'For each match, Paasxo holds the full payment safely until 48 hours before kickoff, then settles your share (the total charged, minus Paasxo\'s 5% platform fee) as a payout.'}
              {' '}Payouts are currently wired manually by our team once confirmed — make sure these details are
              accurate so your money reaches the right account.
            </Text>
          </View>
        </Card>

        {existing && (
          <Card style={styles.currentCard}>
            <Text style={styles.currentLabel}>Currently on file</Text>
            <Text style={styles.currentValue}>{existing.bankName} — {existing.branchName}</Text>
            <Text style={styles.currentValue}>{existing.accountHolderName}</Text>
            <Text style={styles.currentMasked}>{existing.accountNumberMasked}</Text>
          </Card>
        )}

        <FormInput icon="business-outline" placeholder="Bank name (e.g. Sampath Bank)" value={bankName} onChangeText={setBankName} />
        <FormInput icon="location-outline" placeholder="Branch name" value={branchName} onChangeText={setBranchName} />
        <FormInput icon="person-outline" placeholder="Account holder name" autoCapitalize="words" value={accountHolderName} onChangeText={setAccountHolderName} />
        <FormInput icon="card-outline" placeholder="Account number" keyboardType="number-pad" value={accountNumber} onChangeText={setAccountNumber} />

        <PrimaryButton
          title={existing ? 'Update Bank Account' : 'Save Bank Account'}
          onPress={() => saveMutation.mutate()}
          loading={saveMutation.isPending || isLoading}
          disabled={!canSave}
          style={{ marginTop: spacing.md }}
        />

        <View style={styles.securityRow}>
          <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
          <Text style={styles.securityText}>Your full account number is never shown again after saving — only the last 4 digits.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  guideCard: { backgroundColor: colors.primarySoft, marginBottom: spacing.md },
  guideRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  guideText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
  currentCard: { marginBottom: spacing.md },
  currentLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', fontWeight: '700', marginBottom: spacing.xs },
  currentValue: { color: colors.text, fontSize: 14, marginTop: 2 },
  currentMasked: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs, letterSpacing: 1 },
  securityRow: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  securityText: { color: colors.textMuted, fontSize: 12 },
});
