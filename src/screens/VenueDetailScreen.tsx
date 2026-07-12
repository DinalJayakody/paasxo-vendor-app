import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '@/theme';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import EmptyState from '@/components/EmptyState';
import { FutsalApi } from '@/api/futsal';
import { BookingApi } from '@/api/booking';
import { TimeSlot, VendorBooking } from '@/types';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function timeLabel(time: string) {
  return time.slice(0, 5);
}

function PulsingDot() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 700, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: 1 / scale.value }));
  return (
    <View style={styles.dotWrap}>
      <View style={styles.dotCore} />
      <Animated.View style={[styles.dotPulse, style]} />
    </View>
  );
}

/** Venue detail: real venue data, today's live slot snapshot, and upcoming bookings for this venue. */
export default function VenueDetailScreen({ route, navigation }: any) {
  const { venueId } = route.params;
  const today = todayIso();

  const { data: venue, isLoading: loadingVenue } = useQuery({
    queryKey: ['venue-detail', venueId],
    queryFn: () => FutsalApi.getById(venueId),
  });
  const { data: todaySlots, isLoading: loadingSlots } = useQuery({
    queryKey: ['availability', venueId, today],
    queryFn: () => FutsalApi.slotsForDate(venueId, today),
  });
  const { data: allBookings } = useQuery({
    queryKey: ['vendor-dashboard', 'bookings'],
    queryFn: BookingApi.vendorBookings,
  });

  if (loadingVenue || !venue) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const availableToday = todaySlots?.filter((s: TimeSlot) => s.status === 'AVAILABLE').length ?? 0;
  const totalToday = todaySlots?.length ?? 0;

  const upcomingBookings = (allBookings ?? [])
    .filter((b: VendorBooking) => b.futsalId === venueId && b.status !== 'CANCELLED' && b.slotDate >= today)
    .sort((a: VendorBooking, b: VendorBooking) => (a.slotDate + a.startTime).localeCompare(b.slotDate + b.startTime))
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView>
        <View style={styles.heroWrap}>
          {venue.imageBase64 ? (
            <Image source={{ uri: `data:image/jpeg;base64,${venue.imageBase64}` }} style={styles.hero} />
          ) : (
            <View style={[styles.hero, { backgroundColor: colors.primaryDark }]} />
          )}
          <View style={styles.heroScrim} />
          <TouchableOpacity style={styles.backFab} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.editFab} onPress={() => navigation.navigate('CreateVenue', { venueId })} hitSlop={8}>
            <Ionicons name="pencil" size={16} color={colors.text} />
          </TouchableOpacity>
          <Animated.View entering={FadeInUp.duration(450).springify()} style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>{venue.name}</Text>
            <View style={styles.heroAddressRow}>
              <Ionicons name="location" size={13} color="#E5EEF9" />
              <Text style={styles.heroAddress}>{venue.location}</Text>
            </View>
          </Animated.View>
        </View>

        <View style={styles.body}>
          <Animated.View entering={FadeIn.duration(400).delay(80)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Venue Description</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CreateVenue', { venueId })}>
                  <Text style={styles.editLink}>Edit Info</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.description}>{venue.description || 'No description added yet.'}</Text>
              <View style={styles.factRow}>
                <View style={styles.factChip}>
                  <Ionicons name="cash-outline" size={14} color={colors.primary} />
                  <Text style={styles.factChipText}>LKR {venue.pricePerSlot} / {venue.slotDurationMinutes}min</Text>
                </View>
                <View style={styles.factChip}>
                  <Ionicons name="time-outline" size={14} color={colors.primary} />
                  <Text style={styles.factChipText}>{timeLabel(venue.openTime)}–{timeLabel(venue.closeTime)}</Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(160)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Live Status</Text>
                <View style={styles.activePill}>
                  {venue.active && <PulsingDot />}
                  <Text style={styles.activePillText}>{venue.active ? 'ACTIVE' : 'INACTIVE'}</Text>
                </View>
              </View>
              {loadingSlots ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
              ) : (
                <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>
                  {totalToday > 0
                    ? `${availableToday} of ${totalToday} slots open today`
                    : 'No slots generated for today yet — generate them from Manage Availability.'}
                </Text>
              )}
            </Card>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(220)}>
            <Card>
              <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
              {upcomingBookings.length === 0 ? (
                <EmptyState
                  pose="sit"
                  title="No upcoming bookings"
                  message="Bookings players make for this venue will show up here."
                  style={{ paddingVertical: spacing.md }}
                />
              ) : (
                upcomingBookings.map((b: VendorBooking) => (
                  <View key={b.id} style={styles.bookingRow}>
                    <View style={styles.bookingDateBadge}>
                      <Text style={styles.bookingDateDay}>{b.slotDate.slice(8, 10)}</Text>
                      <Text style={styles.bookingDateMonth}>{b.slotDate.slice(5, 7)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookingTitle}>{b.title || b.sport || 'Booking'}</Text>
                      <Text style={styles.bookingMeta}>{timeLabel(b.startTime)}–{timeLabel(b.endTime)}</Text>
                    </View>
                    {b.totalPrice != null && <Text style={styles.bookingAmount}>LKR {b.totalPrice}</Text>}
                  </View>
                ))
              )}
            </Card>
          </Animated.View>

          <PrimaryButton
            title="Manage Availability"
            icon="calendar-outline"
            onPress={() => navigation.navigate('ManageAvailability', { venueId })}
            style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  heroWrap: { height: 240, backgroundColor: colors.border },
  hero: { width: '100%', height: '100%' },
  heroScrim: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 120,
    backgroundColor: 'rgba(15,42,68,0.55)',
  },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md },
  heroTitle: { ...typography.h2, color: colors.white },
  heroAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  heroAddress: { color: '#E5EEF9' },
  backFab: {
    position: 'absolute', top: spacing.md, left: spacing.md, backgroundColor: 'rgba(255,255,255,0.92)',
    width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
  },
  editFab: {
    position: 'absolute', top: spacing.md, right: spacing.md, backgroundColor: 'rgba(255,255,255,0.92)',
    width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typography.h3, color: colors.text },
  editLink: { color: colors.primary, fontWeight: '600' },
  description: { color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  factChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  factChipText: { color: colors.text, fontWeight: '600' },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
  },
  activePillText: { color: colors.success, fontWeight: '700', fontSize: 12 },
  dotWrap: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  dotCore: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success, position: 'absolute' },
  dotPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  bookingRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm,
  },
  bookingDateBadge: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  bookingDateDay: { fontWeight: '800', color: colors.primary, fontSize: 15, lineHeight: 18 },
  bookingDateMonth: { fontWeight: '600', color: colors.primary, fontSize: 10, textTransform: 'uppercase' },
  bookingTitle: { fontWeight: '700', color: colors.text },
  bookingMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  bookingAmount: { fontWeight: '800', color: colors.text },
});
