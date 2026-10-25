import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { Venue, VendorBooking } from '@/types';
import { FutsalApi } from '@/api/futsal';
import { BookingApi } from '@/api/booking';
import { NotificationApi } from '@/api/notification';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenHeader from '@/components/ScreenHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import ScreenGlow from '@/components/ScreenGlow';
import { useGlassTabBarHeight } from '@/components/GlassTabBar';
import { useAuthStore } from '@/store/authStore';

function openInMaps(latitude?: number, longitude?: number) {
  if (latitude == null || longitude == null) return;
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
}

/** My Venues (real venues owned by the vendor, from GET /futsals/mine) + real booking-derived stats. */
export default function DashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const tabBarHeight = useGlassTabBarHeight();
  const user = useAuthStore((s) => s.user);
  const {
    data: venues, isLoading: loadingVenues, refetch: refetchVenues, isRefetching: refetchingVenues,
  } = useQuery({ queryKey: ['vendor-dashboard', 'venues'], queryFn: FutsalApi.getMine });
  const {
    data: bookings, isLoading: loadingBookings, refetch: refetchBookings, isRefetching: refetchingBookings,
  } = useQuery({ queryKey: ['vendor-dashboard', 'bookings'], queryFn: BookingApi.vendorBookings });
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: NotificationApi.unreadCount,
    refetchInterval: 15000,
  });

  const isLoading = loadingVenues || loadingBookings;
  const isRefetching = refetchingVenues || refetchingBookings;
  const refetch = () => { refetchVenues(); refetchBookings(); };

  const totalBookings = bookings?.length ?? 0;
  const totalRevenue = (bookings ?? [])
    .filter((b: VendorBooking) => b.status === 'ACTIVE_MATCH')
    .reduce((sum: number, b: VendorBooking) => sum + (b.totalPrice ?? 0), 0);
  const pendingRequests = (bookings ?? []).filter((b: VendorBooking) => b.status === 'PENDING_VENDOR').length;
  const activeVenues = (venues ?? []).filter((v: Venue) => v.active).length;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader
        title={user?.displayName ?? 'Venue Manager'}
        subtitle="Welcome back — here's your venue overview."
        rightElement={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.8}
              style={styles.bellBtn}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.white} />
              {!!unreadCount && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} activeOpacity={0.8}>
              <Image source={require('../../assets/logo.jpeg')} style={styles.headerLogo} />
            </TouchableOpacity>
          </View>
        }
      >
        <PrimaryButton
          title="Add New Venue"
          icon="add-circle-outline"
          variant="ghost"
          onPress={() => navigation.navigate('CreateVenue')}
          style={styles.addBtn}
        />
      </ScreenHeader>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <Text style={styles.sectionTitle}>My Venues</Text>
        <Text style={styles.sectionSubtitle}>Manage your sports facilities and booking availability.</Text>

        {!venues?.length ? (
          <EmptyState
            pose="cheer"
            title="No venues yet"
            message="Add your first sports venue to start accepting bookings from players."
            ctaLabel="+ Add Venue"
            onCta={() => navigation.navigate('CreateVenue')}
          />
        ) : (
          venues.map((venue: Venue, index: number) => (
            <Animated.View key={venue.id} entering={FadeInUp.duration(450).delay(index * 90).springify()}>
              <Card style={styles.venueCard}>
                <View style={styles.venueImageWrap}>
                  {venue.imageUrl || venue.imageBase64 ? (
                    <Image
                      source={{ uri: venue.imageUrl || `data:image/jpeg;base64,${venue.imageBase64}` }}
                      style={styles.venueImage}
                    />
                  ) : (
                    <View style={[styles.venueImage, styles.venueImagePlaceholder]} />
                  )}
                  <View style={[styles.statusBadge, venue.pendingReview ? styles.reviewBadge : venue.active ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={[styles.statusText, venue.pendingReview ? styles.reviewText : venue.active ? styles.activeText : styles.inactiveText]}>
                      {venue.pendingReview ? 'Under review' : venue.active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <View style={{ padding: spacing.md }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.venueName}>{venue.name}</Text>
                    <Text style={styles.venuePrice}>LKR {venue.pricePerSlot}/slot</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.rowInline}
                    onPress={() => openInMaps(venue.latitude, venue.longitude)}
                    disabled={venue.latitude == null || venue.longitude == null}
                  >
                    <Ionicons name="location-outline" size={14} color={colors.primary} />
                    <Text style={styles.venueLink} numberOfLines={1}>{venue.location} · View on Map</Text>
                  </TouchableOpacity>
                  <View style={styles.rowGap}>
                    <PrimaryButton
                      title="Manage"
                      variant="outline"
                      onPress={() => navigation.navigate('VenueDetail', { venueId: venue.id })}
                      style={{ flex: 1 }}
                    />
                    <TouchableOpacity
                      style={styles.editIconBtn}
                      onPress={() => navigation.navigate('CreateVenue', { venueId: venue.id })}
                    >
                      <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            </Animated.View>
          ))
        )}

        <Text style={[styles.sectionTitle, { fontSize: 20, marginTop: spacing.sm }]}>Overview</Text>
        {pendingRequests > 0 && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Notifications')}>
            <StatCard
              icon="hourglass-outline"
              label="Awaiting Your Decision"
              value={pendingRequests}
              sub="Tap to review requests"
              accent={colors.warning}
              delay={0}
            />
          </TouchableOpacity>
        )}
        <StatCard
          icon="calendar"
          label="Total Bookings"
          value={totalBookings}
          accent={colors.primary}
          delay={40}
        />
        <StatCard
          icon="cash-outline"
          label="Revenue"
          value={totalRevenue}
          prefix="LKR "
          accent={colors.teal}
          delay={80}
        />
        <StatCard
          icon="storefront-outline"
          label="Active Venues"
          value={activeVenues}
          sub={`${venues?.length ?? 0} total`}
          accent={colors.premium}
          delay={160}
        />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  headerLogo: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bellBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.heroStart,
  },
  bellBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  addBtn: { alignSelf: 'flex-start', marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  scroll: { padding: spacing.md },
  sectionTitle: { ...typography.h1, fontSize: 22, color: colors.text, marginTop: spacing.sm },
  sectionSubtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  venueCard: { padding: 0, overflow: 'hidden' },
  venueImageWrap: { height: 160, backgroundColor: colors.border },
  venueImage: { width: '100%', height: '100%' },
  venueImagePlaceholder: { backgroundColor: colors.primaryDark },
  statusBadge: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
  },
  activeBadge: { backgroundColor: colors.successLight },
  inactiveBadge: { backgroundColor: colors.dangerLight },
  reviewBadge: { backgroundColor: colors.warningLight },
  reviewText: { color: colors.warning },
  statusText: { fontWeight: '700', fontSize: 12 },
  activeText: { color: colors.success },
  inactiveText: { color: colors.danger },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  venueName: { ...typography.h3, color: colors.text, flexShrink: 1 },
  venuePrice: { ...typography.label, color: colors.primary },
  rowInline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginBottom: spacing.sm },
  venueLink: { color: colors.primary, fontSize: 13, flexShrink: 1 },
  rowGap: { flexDirection: 'row', gap: spacing.sm },
  editIconBtn: {
    width: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
});
