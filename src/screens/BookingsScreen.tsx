import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { radius, spacing, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/Card';
import StatusBadge from '@/components/StatusBadge';
import ScreenHeader from '@/components/ScreenHeader';
import SelectChip from '@/components/SelectChip';
import EmptyState from '@/components/EmptyState';
import ScreenGlow from '@/components/ScreenGlow';
import { useGlassTabBarHeight } from '@/components/GlassTabBar';
import { BookingApi } from '@/api/booking';
import { VendorBooking } from '@/types';

const FILTERS = ['ALL', 'PENDING_VENDOR', 'ACTIVE_MATCH', 'CANCELLED'] as const;
const FILTER_LABELS: Record<(typeof FILTERS)[number], string> = {
  ALL: 'All',
  PENDING_VENDOR: 'Pending',
  ACTIVE_MATCH: 'Active',
  CANCELLED: 'Cancelled',
};

function timeLabel(t?: string) {
  return t ? t.slice(0, 5) : '';
}

/** Booking Management: reads straight from the shared Booking table the User App writes to via POST /bookings. */
export default function BookingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const tabBarHeight = useGlassTabBarHeight();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['vendor-bookings'], queryFn: BookingApi.vendorBookings });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');

  const cancelMutation = useMutation({
    mutationFn: (id: number) => BookingApi.cancelAsVendor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor-bookings'] }),
    onError: () => Alert.alert('Error', 'Could not cancel booking'),
  });

  const bookings: VendorBooking[] = data ?? [];
  const filtered = useMemo(
    () => (filter === 'ALL' ? bookings : bookings.filter((b: VendorBooking) => b.status === filter)),
    [bookings, filter],
  );
  const pendingCount = bookings.filter((b: VendorBooking) => b.status === 'PENDING_VENDOR').length;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader
        title="Bookings"
        subtitle={`${bookings.length} total · ${pendingCount} awaiting review`}
        compact
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight }]}>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <SelectChip key={f} label={FILTER_LABELS[f]} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </View>

        {filtered.length === 0 ? (
          <EmptyState pose="sit" title="No bookings here" message="Bookings matching this filter will show up here as customers reserve your venues." />
        ) : (
          filtered.map((b: VendorBooking, index: number) => {
            const isPending = b.status === 'PENDING_VENDOR';
            return (
              <Animated.View key={b.id} entering={FadeInUp.duration(400).delay(index * 70).springify()}>
                <TouchableOpacity
                  activeOpacity={isPending ? 0.85 : 1}
                  disabled={!isPending}
                  onPress={() => navigation.navigate('BookingRequestDetail', { bookingId: b.id })}
                >
                  <Card style={[styles.bookingCard, isPending && styles.bookingCardPending]}>
                    <View style={[styles.accentBar, { backgroundColor: statusAccent(b.status, colors) }]} />
                    <View style={styles.bookingBody}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.customer} numberOfLines={1}>
                          {b.title || b.sport || 'Booking'}
                          {b.walkIn ? ' · Walk-in' : ''}
                        </Text>
                        <StatusBadge status={b.status} />
                      </View>
                      <Text style={styles.meta}>{b.futsalName}{b.sport ? ` · ${b.sport}` : ''}</Text>
                      <Text style={styles.meta}>{b.slotDate} · {timeLabel(b.startTime)}–{timeLabel(b.endTime)}</Text>
                      {b.totalPrice != null && <Text style={styles.amount}>LKR {b.totalPrice.toFixed(2)}</Text>}

                      {isPending ? (
                        <View style={styles.reviewHint}>
                          <Ionicons name="hourglass-outline" size={14} color={colors.warning} />
                          <Text style={styles.reviewHintText}>Tap to review and accept/reject</Text>
                        </View>
                      ) : b.status === 'ACTIVE_MATCH' && (
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => cancelMutation.mutate(b.id)}
                          >
                            <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                            <Text style={styles.rejectText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function statusAccent(status: string, colors: ThemeColors) {
  switch (status) {
    case 'PENDING_VENDOR': return colors.warning;
    case 'ACTIVE_MATCH': return colors.primary;
    case 'CANCELLED': return colors.danger;
    default: return colors.border;
  }
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.md },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xs },
  bookingCard: { flexDirection: 'row', padding: 0, overflow: 'hidden' },
  bookingCardPending: { borderWidth: 1, borderColor: colors.warning + '50' },
  accentBar: { width: 5 },
  bookingBody: { flex: 1, padding: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customer: { fontWeight: '700', fontSize: 16, color: colors.text, flexShrink: 1 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  amount: { fontWeight: '800', fontSize: 16, color: colors.text, marginTop: spacing.xs },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 10, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  rejectBtn: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  rejectText: { color: colors.danger, fontWeight: '700' },
  reviewHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  reviewHintText: { color: colors.warning, fontWeight: '700', fontSize: 12 },
});
