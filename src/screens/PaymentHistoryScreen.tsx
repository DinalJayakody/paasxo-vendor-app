import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  FadeInUp, useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '@/theme';
import Card from '@/components/Card';
import StatusBadge from '@/components/StatusBadge';
import ScreenHeader from '@/components/ScreenHeader';
import StatCard from '@/components/StatCard';
import SelectChip from '@/components/SelectChip';
import EmptyState from '@/components/EmptyState';
import { VendorApi } from '@/api/vendor';
import { PaymentItem } from '@/types';

const FILTERS = ['All Transactions', 'Paid', 'Pending', 'Failed'];

function EfficiencyBar({ percent }: { percent: number }) {
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
  const [filter, setFilter] = useState('All Transactions');

  const { data: summary } = useQuery({ queryKey: ['payment-summary'], queryFn: VendorApi.paymentSummary });
  const { data: payments, isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => VendorApi.payments(0, 20) });

  const filtered = payments?.content.filter((p: PaymentItem) => {
    if (filter === 'All Transactions') return true;
    return p.status.toUpperCase() === filter.toUpperCase();
  }) ?? [];

  return (
    <View style={styles.safe}>
      <ScreenHeader title="Payment History" subtitle="Track your revenue and transactions" compact />
      <ScrollView contentContainerStyle={styles.scroll}>
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
          <EfficiencyBar percent={summary?.dailyBookingEfficiencyPercent ?? 0} />
        </Card>

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
                  <Text style={styles.txAvatarText}>{p.sport?.[0] ?? '?'}</Text>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
