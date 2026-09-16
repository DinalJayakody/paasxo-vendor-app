import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { AdminVendorApi } from '@/api/admin';
import { Payout } from '@/types';
import ScreenGlow from '@/components/ScreenGlow';
import ScreenHeader from '@/components/ScreenHeader';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import StatusBadge from '@/components/StatusBadge';
import FormInput from '@/components/FormInput';
import EmptyState from '@/components/EmptyState';

function formatLKR(amount: number) {
  return `LKR ${Math.round(amount).toLocaleString()}`;
}

/** Every payout owed/paid to this vendor, with a "Mark as Paid" action for
 *  anything still DUE — reached from AdminVendorDetailScreen. */
export default function AdminVendorPayoutsScreen({ route, navigation }: any) {
  const { firebaseUid } = route.params;
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [payModalPayout, setPayModalPayout] = useState<Payout | null>(null);

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['admin', 'vendor', firebaseUid],
    queryFn: () => AdminVendorApi.detail(firebaseUid),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ payoutId, reference }: { payoutId: number; reference?: string }) =>
      AdminVendorApi.markPayoutPaid(firebaseUid, payoutId, reference),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'vendor', firebaseUid], updated);
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      setPayModalPayout(null);
    },
    onError: (e: any) => Alert.alert('Could not mark payout paid', e?.response?.data?.message ?? e?.response?.data?.error ?? 'Please try again'),
  });

  if (isLoading || !vendor) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader title="Payouts" subtitle={`${vendor.displayName} · LKR ${Math.round(vendor.totalDue).toLocaleString()} due`} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {vendor.payouts.length === 0 ? (
          <EmptyState title="No payouts yet" message="Payouts are created once a booking settles (48h before kickoff)." />
        ) : (
          vendor.payouts.map((payout) => (
            <Card key={payout.id} style={styles.card}>
              <View style={styles.topLine}>
                <Text style={styles.title} numberOfLines={1}>{payout.bookingTitle ?? payout.futsalName ?? `Booking #${payout.bookingId}`}</Text>
                <StatusBadge status={payout.status} />
              </View>
              <Text style={styles.sub}>{payout.futsalName} · {payout.slotDate ?? '—'}</Text>
              <Text style={styles.price}>Net payout: {formatLKR(payout.netPayoutAmount)}</Text>
              <Text style={styles.sub}>Gross {formatLKR(payout.grossAmount)} · Commission {formatLKR(payout.commissionAmount)}</Text>
              {payout.status === 'PAID' && payout.paidReference ? (
                <Text style={styles.sub}>Reference: {payout.paidReference}</Text>
              ) : null}
              {payout.status === 'DUE' && (
                <PrimaryButton
                  title="Mark as Paid"
                  variant="outline"
                  icon="checkmark-outline"
                  onPress={() => setPayModalPayout(payout)}
                  style={styles.markPaidBtn}
                />
              )}
            </Card>
          ))
        )}
      </ScrollView>

      <MarkPaidModal
        colors={colors}
        payout={payModalPayout}
        loading={markPaidMutation.isPending}
        onClose={() => setPayModalPayout(null)}
        onConfirm={(reference) => payModalPayout && markPaidMutation.mutate({ payoutId: payModalPayout.id, reference })}
      />
    </View>
  );
}

function MarkPaidModal({
  colors, payout, loading, onClose, onConfirm,
}: {
  colors: ThemeColors; payout: Payout | null; loading: boolean;
  onClose: () => void; onConfirm: (reference?: string) => void;
}) {
  const styles = modalStyles(colors);
  const [reference, setReference] = useState('');

  React.useEffect(() => { setReference(''); }, [payout?.id]);

  if (!payout) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Confirm Payout</Text>
          <Text style={styles.subtitle}>{formatLKR(payout.netPayoutAmount)} to this vendor</Text>
          <Text style={styles.hint}>Only confirm once you've actually sent this via bank transfer outside the app. Add a reference (e.g. transaction ID) for your records.</Text>

          <FormInput icon="document-text-outline" placeholder="Bank reference (optional)" value={reference} onChangeText={setReference} />

          <View style={styles.actionsRow}>
            <PrimaryButton title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton title="Confirm Paid" onPress={() => onConfirm(reference.trim() || undefined)} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  title: { ...typography.h3, color: colors.text },
  subtitle: { ...typography.body, color: colors.primary, fontWeight: '700', marginTop: 2, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: { paddingVertical: spacing.md },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.body, fontWeight: '700', color: colors.text, flexShrink: 1 },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  price: { ...typography.body, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  markPaidBtn: { marginTop: spacing.sm, paddingVertical: 8 },
});
