import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  FadeInUp, useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/Card';
import StatusBadge from '@/components/StatusBadge';
import ScreenHeader from '@/components/ScreenHeader';
import StatCard from '@/components/StatCard';
import SelectChip from '@/components/SelectChip';
import EmptyState from '@/components/EmptyState';
import ScreenGlow from '@/components/ScreenGlow';
import { useGlassTabBarHeight } from '@/components/GlassTabBar';
import { VendorApi } from '@/api/vendor';
import { PaymentItem, Payout } from '@/types';

const FILTERS = ['All Transactions', 'Paid', 'Pending', 'Failed'];
const VIEW_MODES = ['Transactions', 'Payouts'] as const;
type ViewMode = (typeof VIEW_MODES)[number];

function EfficiencyBar({ percent, styles }: { percent: number; styles: ReturnType<typeof createStyles> }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(percent, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [percent]);
  const style = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, style]} />
    </View>
  );
}

/** Matches the reference "Payment History" screen: revenue summary, efficiency bar, transaction list. */
export default function PaymentHistoryScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const tabBarHeight = useGlassTabBarHeight();
  const [filter, setFilter] = useState('All Transactions');
  const [viewMode, setViewMode] = useState<ViewMode>('Transactions');

  const { data: summary } = useQuery({ queryKey: ['payment-summary'], queryFn: VendorApi.paymentSummary });
  const { data: payments, isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => VendorApi.payments(0, 20) });
  const { data: payouts, isLoading: payoutsLoading } = useQuery({ queryKey: ['payouts'], queryFn: VendorApi.payouts });

  const filtered = payments?.content.filter((p: PaymentItem) => {
    if (filter === 'All Transactions') return true;
    return p.status.toUpperCase() === filter.toUpperCase();
  }) ?? [];

  const duePayouts = payouts?.filter((p) => p.status === 'DUE') ?? [];
  const totalDue = duePayouts.reduce((sum, p) => sum + p.netPayoutAmount, 0);

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader title="Payment History" subtitle="Track your revenue and transactions" compact />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight }]}>
        <StatCard
          icon="trending-up"
          label="Total Revenue"
          value={summary?.totalRevenue ?? 0}
          prefix="LKR "
          accent={colors.teal}
        />

        <Card>
          <Text style={styles.statLabel}>DAILY BOOKING EFFICIENCY</Text>
          <Text style={styles.statValue}>{summary?.dailyBookingEfficiencyPercent ?? 0}%</Text>
          <EfficiencyBar percent={summary?.dailyBookingEfficiencyPercent ?? 0} styles={styles} />
        </Card>

        <View style={styles.filterRow}>
          {VIEW_MODES.map((v) => (
            <SelectChip key={v} label={v} selected={viewMode === v} onPress={() => setViewMode(v)} />
          ))}
        </View>

        {viewMode === 'Transactions' ? (
          <>
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <SelectChip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
              ))}
            </View>

            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
            ) : filtered.length === 0 ? (
              <EmptyState pose="sit" title="No transactions" message="Transactions matching this filter will appear here." />
            ) : (
              <Card style={{ padding: 0 }}>
                {filtered.map((p: PaymentItem, idx: number) => (
                  <Animated.View
                    key={p.id}
                    entering={FadeInUp.duration(400).delay(idx * 60).springify()}
                    style={[styles.txRow, idx !== filtered.length - 1 && styles.txDivider]}
                  >
                    <View style={styles.txAvatar}>
                      {p.sourceType === 'TRAINER_PLAN' ? (
                        <Ionicons name="clipboard" size={18} color={colors.success} />
                      ) : p.sourceType === 'TRAINER_SESSION' ? (
                        <Ionicons name="barbell" size={18} color={colors.success} />
                      ) : (
                        <Text style={styles.txAvatarText}>{p.sport?.[0] ?? '?'}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txName}>{p.customerName}</Text>
                      <Text style={styles.txSport}>{p.sport}</Text>
                      <Text style={styles.txDate}>{p.dateRange}</Text>
                      <StatusBadge status={p.status} />
                    </View>
                    <Text style={styles.txAmount}>LKR {p.amount.toFixed(2)}</Text>
                  </Animated.View>
                ))}
              </Card>
            )}

            {payments && (
              <Text style={styles.pageInfo}>
                Showing {filtered.length} of {payments.totalElements} transactions
              </Text>
            )}
          </>
        ) : (
          <>
            <Card style={styles.guideCard}>
              <View style={styles.guideRow}>
                <Ionicons name="information-circle" size={20} color={colors.info} />
                <Text style={styles.guideText}>
                  Paasxo holds each payment safely until shortly before the booking or session starts (48
                  hours for venue bookings, 24 hours for trainer sessions), so the customer can always be
                  refunded in full if it's cancelled before then. Once that window passes, your share (the
                  total charged, minus Paasxo's platform fee) becomes a payout below. Payouts are currently
                  wired to your bank account manually by our team — "Due" means it's confirmed and waiting
                  to be transferred; "Paid" means the transfer has already been made.
                </Text>
              </View>
            </Card>

            {duePayouts.length > 0 && (
              <StatCard
                icon="wallet"
                label="Total Due To You"
                value={totalDue}
                prefix="LKR "
                accent={colors.warning}
              />
            )}

            {payoutsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
            ) : !payouts || payouts.length === 0 ? (
              <EmptyState pose="sit" title="No payouts yet" message="Payouts appear here once a booking or session settles, shortly before it starts." />
            ) : (
              <Card style={{ padding: 0 }}>
                {payouts.map((p: Payout, idx: number) => (
                  <Animated.View
                    key={p.id}
                    entering={FadeInUp.duration(400).delay(idx * 60).springify()}
                    style={[styles.txRow, idx !== payouts.length - 1 && styles.txDivider]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txName}>
                        {p.bookingTitle ?? (p.sourceType === 'TRAINER_PLAN' ? 'Trainer plan' : p.sourceType === 'TRAINER_SESSION' ? `Session #${p.trainerBookingId}` : `Booking #${p.bookingId}`)}
                      </Text>
                      <Text style={styles.txSport}>{p.futsalName ?? (p.sourceType === 'TRAINER_PLAN' ? 'Plan / membership' : p.sourceType === 'TRAINER_SESSION' ? 'Trainer session' : '')}</Text>
                      <Text style={styles.txDate}>
                        {p.slotDate} • Gross LKR {p.grossAmount.toFixed(2)} − {(p.commissionRate * 100).toFixed(0)}% fee
                      </Text>
                      <StatusBadge status={p.status} />
                    </View>
                    <Text style={styles.txAmount}>LKR {p.netPayoutAmount.toFixed(2)}</Text>
                  </Animated.View>
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', fontWeight: '700' },
  statValue: { ...typography.h1, fontSize: 30, color: colors.primary, marginTop: spacing.xs },
  progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: radius.pill, marginTop: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: spacing.xs },
  txRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, alignItems: 'flex-start' },
  txDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  txAvatar: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.successLight, alignItems: 'center', justifyContent: 'center' },
  txAvatarText: { fontWeight: '800', color: colors.success },
  txName: { fontWeight: '700', color: colors.text },
  txSport: { color: colors.primary, fontSize: 13 },
  txDate: { color: colors.textMuted, fontSize: 12, marginVertical: 2 },
  txAmount: { fontWeight: '800', fontSize: 16, color: colors.text },
  pageInfo: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xl },
  guideCard: { backgroundColor: colors.primarySoft, marginBottom: spacing.md },
  guideRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  guideText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
});
