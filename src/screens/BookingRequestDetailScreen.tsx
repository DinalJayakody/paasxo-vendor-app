import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, {
  FadeIn, FadeInUp, FadeOut, useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '@/theme';
import Card from '@/components/Card';
import GradientBackground from '@/components/GradientBackground';
import PrimaryButton from '@/components/PrimaryButton';
import { BookingApi } from '@/api/booking';

function timeLabel(t?: string) {
  return t ? t.slice(0, 5) : '';
}

function formatDate(iso?: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Soft, slow-breathing urgency ring behind the hourglass icon — draws the eye without nagging. */
function PulsingRing() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.45, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 1 - (scale.value - 1) / 0.45,
  }));
  return <Animated.View style={[styles.ring, style]} />;
}

type Outcome = null | 'accepted' | 'rejected';

/** Reached from a notification tap, the Notifications list, Bookings list, or a
 *  "Request Pending" slot in Manage Availability — always re-fetches by id so the
 *  vendor is acting on live data, not a possibly-stale cached row. */
export default function BookingRequestDetailScreen({ route, navigation }: any) {
  const { bookingId } = route.params;
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [outcome, setOutcome] = useState<Outcome>(null);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => BookingApi.byId(bookingId),
  });

  const invalidateEverything = () => {
    queryClient.invalidateQueries({ queryKey: ['vendor-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['availability'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const acceptMutation = useMutation({
    mutationFn: () => BookingApi.acceptBooking(bookingId),
    onSuccess: () => { invalidateEverything(); setOutcome('accepted'); },
    onError: (e: any) => Alert.alert('Could not accept', e?.response?.data?.message ?? 'Please try again'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => BookingApi.rejectBooking(bookingId, reason.trim() || undefined),
    onSuccess: () => { invalidateEverything(); setOutcome('rejected'); },
    onError: (e: any) => Alert.alert('Could not reject', e?.response?.data?.message ?? 'Please try again'),
  });

  const organizerName = booking?.players?.[0]?.displayName;
  const isPending = booking?.status === 'PENDING_VENDOR';

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.warning} size="large" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>This request could not be found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={styles.hero}>
        <GradientBackground colors={outcome === 'rejected' ? [colors.danger, '#7F1D1D'] : ['#EA580C', '#C2410C']} />
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={22} color={colors.white} />
        </TouchableOpacity>

        {outcome === null ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.heroIconWrap}>
            <PulsingRing />
            <View style={styles.heroIconCore}>
              <Ionicons name="hourglass-outline" size={40} color="#EA580C" />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(300).springify()} style={styles.heroIconWrap}>
            <View style={[styles.heroIconCore, outcome === 'accepted' ? styles.heroIconAccepted : styles.heroIconRejected]}>
              <Ionicons
                name={outcome === 'accepted' ? 'checkmark' : 'close'}
                size={44}
                color={outcome === 'accepted' ? colors.success : colors.danger}
              />
            </View>
          </Animated.View>
        )}

        <Text style={styles.heroTitle}>
          {outcome === 'accepted' ? 'Request Accepted' : outcome === 'rejected' ? 'Request Declined' : 'Booking Request'}
        </Text>
        <Text style={styles.heroSubtitle}>
          {outcome === 'accepted'
            ? 'This match is now live and open for players to join.'
            : outcome === 'rejected'
            ? 'The organizer has been notified and the slot is free again.'
            : isPending
            ? 'A customer wants to book this slot — accept or reject below.'
            : `This request is already ${booking.status === 'ACTIVE_MATCH' ? 'active' : 'closed'}.`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInUp.duration(400).delay(80).springify()}>
          <Card>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Ionicons name="person-outline" size={16} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>ORGANIZER</Text>
                <Text style={styles.detailValue}>{organizerName ?? 'A player'}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Ionicons name="football-outline" size={16} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>MATCH</Text>
                <Text style={styles.detailValue}>{booking.title || booking.sport || 'Booking'}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Ionicons name="calendar-outline" size={16} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>DATE & TIME</Text>
                <Text style={styles.detailValue}>{formatDate(booking.slotDate)}</Text>
                <Text style={styles.detailSub}>
                  {timeLabel(booking.startTime)}–{timeLabel(booking.endTime)}
                  {booking.slotCount && booking.slotCount > 1 ? ` · ${booking.slotCount} slots` : ''}
                </Text>
              </View>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0, marginBottom: 0 }]}>
              <View style={styles.detailIcon}><Ionicons name="business-outline" size={16} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>VENUE</Text>
                <Text style={styles.detailValue}>{booking.futsalName}</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {booking.totalPrice != null && (
          <Animated.View entering={FadeInUp.duration(400).delay(140).springify()} style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total value</Text>
            <Text style={styles.priceValue}>LKR {booking.totalPrice.toFixed(2)}</Text>
          </Animated.View>
        )}

        {isPending && outcome === null && (
          <Animated.View entering={FadeInUp.duration(400).delay(200).springify()}>
            {rejecting ? (
              <Card>
                <Text style={styles.reasonTitle}>Reason (optional)</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="e.g. Venue closed for maintenance that day"
                  placeholderTextColor={colors.textMuted}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                />
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.cancelReasonBtn} onPress={() => setRejecting(false)}>
                    <Text style={styles.cancelReasonText}>Back</Text>
                  </TouchableOpacity>
                  <PrimaryButton
                    title="Confirm Reject"
                    onPress={() => rejectMutation.mutate()}
                    loading={rejectMutation.isPending}
                    style={{ flex: 1, backgroundColor: colors.danger, shadowColor: colors.danger }}
                  />
                </View>
              </Card>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => setRejecting(true)}
                  disabled={acceptMutation.isPending}
                >
                  <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
                <PrimaryButton
                  title="Accept Request"
                  icon="checkmark-circle-outline"
                  onPress={() => acceptMutation.mutate()}
                  loading={acceptMutation.isPending}
                  style={{ flex: 1, backgroundColor: colors.success, shadowColor: colors.success }}
                />
              </View>
            )}
          </Animated.View>
        )}

        {outcome !== null && (
          <Animated.View entering={FadeIn.duration(400).delay(150)} exiting={FadeOut}>
            <PrimaryButton title="Done" onPress={() => navigation.goBack()} style={{ marginTop: spacing.sm }} />
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  notFoundText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  hero: {
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute', top: spacing.xl, right: spacing.lg, zIndex: 2,
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroIconWrap: {
    width: 84, height: 84, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  ring: {
    position: 'absolute', width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  heroIconCore: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  heroIconAccepted: { backgroundColor: colors.successLight },
  heroIconRejected: { backgroundColor: colors.dangerLight },
  heroTitle: { ...typography.h1, fontSize: 24, color: colors.white, textAlign: 'center' },
  heroSubtitle: {
    ...typography.body, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 4, paddingHorizontal: spacing.sm,
  },
  scroll: { padding: spacing.md },
  detailRow: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    paddingBottom: spacing.sm, marginBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  detailLabel: { ...typography.caption, color: colors.textMuted, letterSpacing: 0.4, fontSize: 10, fontWeight: '800' },
  detailValue: { ...typography.body, color: colors.text, fontWeight: '700', marginTop: 2 },
  detailSub: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md,
  },
  priceLabel: { ...typography.body, color: colors.textMuted },
  priceValue: { ...typography.h2, color: colors.primary, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 14,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.danger, backgroundColor: colors.dangerLight,
  },
  rejectBtnText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  reasonTitle: { ...typography.body, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  reasonInput: {
    backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14, color: colors.text,
    minHeight: 70, textAlignVertical: 'top', marginBottom: spacing.sm,
  },
  cancelReasonBtn: { paddingHorizontal: spacing.md, paddingVertical: 14 },
  cancelReasonText: { color: colors.textMuted, fontWeight: '700' },
});
