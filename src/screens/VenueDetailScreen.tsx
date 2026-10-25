import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, {
  FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import EmptyState from '@/components/EmptyState';
import ScreenGlow from '@/components/ScreenGlow';
import SpecialitiesEditor from '@/components/SpecialitiesEditor';
import MediaGalleryEditor from '@/components/MediaGalleryEditor';
import PromotionEditor from '@/components/PromotionEditor';
import { FutsalApi } from '@/api/futsal';
import { BookingApi } from '@/api/booking';
import { TimeSlot, Venue, VendorBooking } from '@/types';

const VENUE_SPECIALITY_IDEAS = [
  'Floodlit for night games', 'Indoor court', 'Artificial turf', 'Free parking', 'Changing rooms',
  'Showers', 'Equipment for hire', 'Coaching available', 'Cafeteria', 'Spectator seating',
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function timeLabel(time: string) {
  return time.slice(0, 5);
}

function PulsingDot({ styles }: { styles: ReturnType<typeof createStyles> }) {
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
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { venueId } = route.params;
  const today = todayIso();
  const queryClient = useQueryClient();
  const { width: screenW } = useWindowDimensions();
  // Responses from specialities/media calls are the full venue — drop them straight into the cache.
  const applyVenue = (v: Venue) => {
    queryClient.setQueryData(['venue-detail', venueId], v);
    queryClient.invalidateQueries({ queryKey: ['vendor-dashboard'] });
  };

  const { data: venue, isLoading: loadingVenue } = useQuery({
    queryKey: ['venue-detail', venueId],
    queryFn: () => FutsalApi.getById(venueId),
  });

  const statusMutation = useMutation({
    mutationFn: (active: boolean) => FutsalApi.setActive(venueId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-detail', venueId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-dashboard'] });
    },
    onError: (e: any) => Alert.alert('Could not update status', e?.response?.data?.message ?? e?.response?.data?.error ?? 'Please try again'),
  });

  const confirmToggle = () => {
    if (!venue) return;
    if (venue.pendingReview) {
      Alert.alert(
        'Under review',
        'Paasxo is reviewing this venue. It goes live automatically once approved, and we\'ll notify you. Meanwhile you can finish its photos, specialities and availability.',
      );
      return;
    }
    const nextActive = !venue.active;
    Alert.alert(
      nextActive ? 'Activate venue?' : 'Deactivate venue?',
      nextActive
        ? `${venue.name} will be bookable again and appear in search right away.`
        : `${venue.name} will be hidden from search and can't accept new bookings until reactivated. Existing bookings are unaffected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: nextActive ? 'Activate' : 'Deactivate', style: nextActive ? 'default' : 'destructive',
          onPress: () => statusMutation.mutate(nextActive) },
      ],
    );
  };
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
      <ScreenGlow />
      <ScrollView>
        <View style={styles.heroWrap}>
          {venue.imageUrl || venue.imageBase64 ? (
            <Image
              source={{ uri: venue.imageUrl || `data:image/jpeg;base64,${venue.imageBase64}` }}
              style={styles.hero}
            />
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
                <TouchableOpacity
                  onPress={confirmToggle}
                  disabled={statusMutation.isPending}
                  style={[styles.activePill, !venue.active && styles.inactivePill, venue.pendingReview && styles.reviewPill]}
                >
                  {statusMutation.isPending ? (
                    <ActivityIndicator size="small" color={venue.active ? colors.success : colors.danger} />
                  ) : venue.pendingReview ? (
                    <>
                      <Ionicons name="hourglass-outline" size={12} color={colors.warning} />
                      <Text style={[styles.activePillText, { color: colors.warning }]}>UNDER REVIEW</Text>
                    </>
                  ) : (
                    <>
                      {venue.active && <PulsingDot styles={styles} />}
                      <Text style={[styles.activePillText, !venue.active && styles.inactivePillText]}>
                        {venue.active ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                      <Ionicons name="chevron-down" size={12} color={venue.active ? colors.success : colors.danger} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {venue.pendingReview ? (
                <Text style={styles.reviewNote}>
                  Paasxo is reviewing this venue before it appears to players. It goes live automatically once approved — we'll notify you.
                </Text>
              ) : (
                <Text style={styles.toggleHint}>Tap the status above to {venue.active ? 'deactivate' : 'activate'} this venue.</Text>
              )}
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

          <Animated.View entering={FadeIn.duration(400).delay(190)}>
            <Card>
              <Text style={styles.sectionTitle}>Specialities</Text>
              <Text style={styles.sectionSub}>Shown to players on your venue page and used in search.</Text>
              <View style={{ marginTop: spacing.md }}>
                <SpecialitiesEditor
                  value={venue.specialities ?? []}
                  suggestions={VENUE_SPECIALITY_IDEAS}
                  placeholder="e.g. Floodlit for night games"
                  onSave={async (next) => applyVenue(await FutsalApi.setSpecialities(venueId, next))}
                />
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(198)}>
            <Card>
              <Text style={styles.sectionTitle}>Discounts</Text>
              <Text style={styles.sectionSub}>Fill quiet hours with a limited-time offer. Players see it on your venue.</Text>
              <View style={{ marginTop: spacing.md }}>
                <PromotionEditor
                  value={venue.promotion}
                  basePrice={venue.pricePerSlot}
                  priceSuffix={` / ${venue.slotDurationMinutes}min`}
                  onSave={async (p) => applyVenue(await FutsalApi.setPromotion(venueId, p))}
                  onClear={async () => applyVenue(await FutsalApi.clearPromotion(venueId))}
                />
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(205)}>
            <Card>
              <Text style={styles.sectionTitle}>Photos & Videos</Text>
              <Text style={styles.sectionSub}>Show off your premises — courts, facilities, night lighting.</Text>
              <View style={{ marginTop: spacing.md }}>
                <MediaGalleryEditor
                  items={venue.media ?? []}
                  width={screenW - spacing.md * 4}
                  onAdd={async (m) => applyVenue(await FutsalApi.addMedia(venueId, m))}
                  onRemove={async (url) => applyVenue(await FutsalApi.removeMedia(venueId, url))}
                />
              </View>
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  // colors.glassStrong (not a hardcoded white) — it's the theme's translucent-circle
  // token and already flips to a dark tint in dark mode, so the colors.text icon
  // drawn on top (light in dark mode) keeps proper contrast instead of landing on
  // a plain white disc.
  backFab: {
    position: 'absolute', top: spacing.md, left: spacing.md, backgroundColor: colors.glassStrong,
    width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  editFab: {
    position: 'absolute', top: spacing.md, right: spacing.md, backgroundColor: colors.glassStrong,
    width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.glassBorder,
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
  inactivePill: { backgroundColor: colors.dangerLight },
  reviewPill: { backgroundColor: colors.warningLight },
  reviewNote: { ...typography.caption, color: colors.warning, marginTop: 8, lineHeight: 18 },
  sectionSub: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  inactivePillText: { color: colors.danger },
  toggleHint: { ...typography.caption, color: colors.textMuted, marginTop: 6, textAlign: 'right' },
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
