import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { AdminVendorApi } from '@/api/admin';
import { AdminVendorDetail, AdminVenueFinancials } from '@/types';
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
function formatPercent(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

/** Every venue ("branch") this vendor owns, with revenue/due/paid and an
 *  editable per-venue commission rate — reached from AdminVendorDetailScreen. */
export default function AdminVendorVenuesScreen({ route, navigation }: any) {
  const { firebaseUid } = route.params;
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [rateModalVenue, setRateModalVenue] = useState<AdminVenueFinancials | null>(null);

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['admin', 'vendor', firebaseUid],
    queryFn: () => AdminVendorApi.detail(firebaseUid),
  });

  const rateMutation = useMutation({
    mutationFn: ({ futsalId, rate }: { futsalId: number; rate: number | null }) =>
      AdminVendorApi.setVenueCommissionRate(firebaseUid, futsalId, rate),
    onSuccess: (updated) => {
      queryClient.setQueryData<AdminVendorDetail | undefined>(['admin', 'vendor', firebaseUid], (prev) => {
        if (!prev) return prev;
        return { ...prev, venueFinancials: prev.venueFinancials.map((v) => (v.futsalId === updated.futsalId ? updated : v)) };
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      setRateModalVenue(null);
    },
    onError: (e: any) => Alert.alert('Could not update commission rate', e?.response?.data?.message ?? e?.response?.data?.error ?? 'Please try again'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ futsalId, active }: { futsalId: number; active: boolean }) =>
      AdminVendorApi.setVenueActive(firebaseUid, futsalId, active),
    onSuccess: (updated) => {
      queryClient.setQueryData<AdminVendorDetail | undefined>(['admin', 'vendor', firebaseUid], (prev) => {
        if (!prev) return prev;
        return { ...prev, venues: prev.venues.map((v) => (v.id === updated.id ? updated : v)) };
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
    onError: (e: any) => Alert.alert('Could not update venue status', e?.response?.data?.message ?? e?.response?.data?.error ?? 'Please try again'),
  });

  const confirmToggleVenue = (venueId: number, venueName: string, currentlyActive: boolean) => {
    const nextActive = !currentlyActive;
    Alert.alert(
      nextActive ? 'Activate venue?' : 'Deactivate venue?',
      nextActive
        ? `${venueName} will be bookable again and appear in search right away.`
        : `${venueName} will be hidden from search and can't accept new bookings until reactivated. Existing bookings are unaffected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: nextActive ? 'Activate' : 'Deactivate', style: nextActive ? 'default' : 'destructive',
          onPress: () => statusMutation.mutate({ futsalId: venueId, active: nextActive }) },
      ],
    );
  };

  if (isLoading || !vendor) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const financialsByFutsalId = new Map(vendor.venueFinancials.map((f) => [f.futsalId, f]));

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader title="Venues" subtitle={vendor.displayName} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {vendor.venues.length === 0 ? (
          <EmptyState title="No venues yet" message="This vendor hasn't created any venues." />
        ) : (
          vendor.venues.map((venue) => {
            const fin = financialsByFutsalId.get(venue.id);
            return (
              <Card key={venue.id} style={styles.card}>
                <View style={styles.topLine}>
                  <Text style={styles.title} numberOfLines={1}>{venue.name}</Text>
                  <StatusBadge status={venue.active ? 'ACTIVE' : 'INACTIVE'} />
                </View>
                <Text style={styles.sub}>{venue.location}</Text>

                <PrimaryButton
                  title={venue.active ? 'Deactivate Venue' : 'Activate Venue'}
                  icon={venue.active ? 'close-circle-outline' : 'checkmark-circle-outline'}
                  variant={venue.active ? 'outline' : 'primary'}
                  onPress={() => confirmToggleVenue(venue.id, venue.name, venue.active)}
                  loading={statusMutation.isPending && statusMutation.variables?.futsalId === venue.id}
                  style={styles.toggleBtn}
                />

                {fin && (
                  <>
                    <View style={styles.moneyGrid}>
                      <MoneyStat colors={colors} label="Revenue" value={formatLKR(fin.totalRevenue)} />
                      <MoneyStat colors={colors} label="Due" value={formatLKR(fin.totalDue)} tone="warning" />
                      <MoneyStat colors={colors} label="Paid" value={formatLKR(fin.totalPaid)} tone="success" />
                      <MoneyStat colors={colors} label="Bookings" value={String(fin.bookingCount)} />
                    </View>

                    <TouchableOpacity style={styles.commissionRow} activeOpacity={0.75} onPress={() => setRateModalVenue(fin)}>
                      <View style={styles.commissionLeft}>
                        <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
                        <Text style={styles.commissionText}>
                          {formatPercent(fin.effectiveCommissionRate)} commission
                          {fin.commissionRate == null ? ' (platform default)' : ' (custom)'}
                        </Text>
                      </View>
                      <Ionicons name="create-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      <CommissionRateModal
        colors={colors}
        venue={rateModalVenue}
        loading={rateMutation.isPending}
        onClose={() => setRateModalVenue(null)}
        onSave={(rate) => rateModalVenue && rateMutation.mutate({ futsalId: rateModalVenue.futsalId, rate })}
      />
    </View>
  );
}

function CommissionRateModal({
  colors, venue, loading, onClose, onSave,
}: {
  colors: ThemeColors; venue: AdminVenueFinancials | null; loading: boolean;
  onClose: () => void; onSave: (rate: number | null) => void;
}) {
  const styles = modalStyles(colors);
  const [text, setText] = useState('');

  React.useEffect(() => {
    if (venue) setText((venue.effectiveCommissionRate * 100).toFixed(1));
  }, [venue?.futsalId]);

  if (!venue) return null;

  const handleSave = () => {
    const parsed = parseFloat(text);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      Alert.alert('Invalid rate', 'Enter a percentage between 0 and 100.');
      return;
    }
    onSave(parsed / 100);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Commission Rate</Text>
          <Text style={styles.subtitle}>{venue.futsalName}</Text>
          <Text style={styles.hint}>The percentage Paasxo keeps from each booking at this venue. Applies to bookings settled from now on — past payouts are unaffected.</Text>

          <FormInput icon="pricetag-outline" placeholder="e.g. 5" keyboardType="decimal-pad" value={text} onChangeText={setText} />

          <View style={styles.actionsRow}>
            <PrimaryButton title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton title="Save" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
          </View>
          {venue.commissionRate != null && (
            <PrimaryButton title="Reset to Platform Default" variant="outline" onPress={() => onSave(null)} loading={loading} style={{ marginTop: spacing.sm }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MoneyStat({ colors, label, value, tone }: { colors: ThemeColors; label: string; value: string; tone?: 'warning' | 'success' }) {
  const tint = tone === 'warning' ? colors.warning : tone === 'success' ? colors.success : colors.text;
  return (
    <View style={{ width: '48%' }}>
      <Text style={{ ...typography.caption, color: colors.textMuted }}>{label}</Text>
      <Text style={{ ...typography.body, fontWeight: '700', color: tint }}>{value}</Text>
    </View>
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
  moneyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  commissionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    backgroundColor: colors.primarySoft, borderRadius: radius.md,
  },
  commissionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commissionText: { ...typography.caption, color: colors.primaryDark, fontWeight: '700' },
  toggleBtn: { marginTop: spacing.sm, paddingVertical: 8 },
});
