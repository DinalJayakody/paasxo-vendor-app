import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { AdminVendorApi } from '@/api/admin';
import ScreenGlow from '@/components/ScreenGlow';
import ScreenHeader from '@/components/ScreenHeader';
import Card from '@/components/Card';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

/** Every booking across every venue this vendor owns — reached from AdminVendorDetailScreen. */
export default function AdminVendorBookingsScreen({ route, navigation }: any) {
  const { firebaseUid } = route.params;
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['admin', 'vendor', firebaseUid],
    queryFn: () => AdminVendorApi.detail(firebaseUid),
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
      <ScreenHeader title="Bookings" subtitle={`${vendor.displayName} · ${vendor.bookings.length} total`} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {vendor.bookings.length === 0 ? (
          <EmptyState title="No bookings yet" message="Bookings across this vendor's venues will show up here." />
        ) : (
          vendor.bookings.map((booking) => (
            <Card key={booking.id} style={styles.card}>
              <View style={styles.topLine}>
                <Text style={styles.title} numberOfLines={1}>{booking.title || booking.futsalName}</Text>
                <StatusBadge status={booking.status} />
              </View>
              <Text style={styles.sub}>{booking.futsalName}</Text>
              <Text style={styles.sub}>{booking.slotDate} · {booking.startTime}–{booking.endTime}</Text>
              {typeof booking.totalPrice === 'number' && (
                <Text style={styles.price}>LKR {Math.round(booking.totalPrice).toLocaleString()}</Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: { paddingVertical: spacing.md },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.body, fontWeight: '700', color: colors.text, flexShrink: 1 },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  price: { ...typography.body, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
});
