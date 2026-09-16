import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { AdminVendorApi } from '@/api/admin';
import ScreenGlow from '@/components/ScreenGlow';
import ScreenHeader from '@/components/ScreenHeader';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';

/** Vendor overview — profile, financial summary, business registration docs,
 *  and Active/Inactive control. Bookings/Payments/Payouts/Venues each live on
 *  their own screen (see AdminVendorVenuesScreen etc.) reached via the
 *  "Manage" rows below, rather than one long scrolling page. */
export default function AdminVendorDetailScreen({ route, navigation }: any) {
  const { firebaseUid } = route.params;
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['admin', 'vendor', firebaseUid],
    queryFn: () => AdminVendorApi.detail(firebaseUid),
  });

  const statusMutation = useMutation({
    mutationFn: (active: boolean) => AdminVendorApi.setStatus(firebaseUid, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendor', firebaseUid] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
    onError: (e: any) => Alert.alert('Could not update status', e?.response?.data?.message ?? e?.response?.data?.error ?? 'Please try again'),
  });

  const confirmToggle = () => {
    if (!vendor) return;
    const nextActive = !vendor.active;
    Alert.alert(
      nextActive ? 'Activate vendor?' : 'Deactivate vendor?',
      nextActive
        ? `${vendor.displayName} will be able to sign in and manage their venues immediately.`
        : `${vendor.displayName} will be signed out and unable to log in until reactivated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: nextActive ? 'Activate' : 'Deactivate', style: nextActive ? 'default' : 'destructive',
          onPress: () => statusMutation.mutate(nextActive) },
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

  const navigateTo = (screen: string) => navigation.navigate(screen, { firebaseUid });

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader title={vendor.displayName} subtitle={vendor.email} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            {vendor.profileImageUrl ? (
              <Image source={{ uri: vendor.profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="storefront-outline" size={22} color={colors.primary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <StatusBadge status={vendor.active ? 'ACTIVE' : 'INACTIVE'} />
            </View>
          </View>

          <InfoRow colors={colors} icon="mail-outline" label="Email" value={vendor.email} />
          <InfoRow colors={colors} icon="call-outline" label="Phone" value={vendor.phoneNumber || '—'} />
          <InfoRow colors={colors} icon="calendar-outline" label="Registered" value={new Date(vendor.createdAt).toLocaleDateString()} />
          {!!vendor.sports?.length && (
            <InfoRow colors={colors} icon="football-outline" label="Sports" value={vendor.sports.join(', ')} />
          )}

          <PrimaryButton
            title={vendor.active ? 'Deactivate Vendor' : 'Activate Vendor'}
            icon={vendor.active ? 'close-circle-outline' : 'checkmark-circle-outline'}
            variant={vendor.active ? 'outline' : 'primary'}
            onPress={confirmToggle}
            loading={statusMutation.isPending}
            style={{ marginTop: spacing.md }}
          />
        </Card>

        <Section title="Financials" colors={colors}>
          <View style={styles.statsGrid}>
            <StatCard icon="cash-outline" label="Total Revenue" value={vendor.totalRevenue} prefix="LKR " decimals={0} style={styles.statCard} />
            <StatCard icon="briefcase-outline" label="Paasxo Commission" value={vendor.totalCommissionEarned} accent={colors.info} prefix="LKR " decimals={0} style={styles.statCard} />
            <StatCard icon="time-outline" label="Amount Due" value={vendor.totalDue} accent={colors.warning} prefix="LKR " decimals={0} style={styles.statCard} />
            <StatCard icon="checkmark-done-outline" label="Amount Paid" value={vendor.totalPaid} accent={colors.success} prefix="LKR " decimals={0} style={styles.statCard} />
          </View>
        </Section>

        <Section title="Manage" colors={colors}>
          <NavRow colors={colors} icon="business-outline" label="Venues" count={vendor.venues.length} onPress={() => navigateTo('AdminVendorVenues')} />
          <NavRow colors={colors} icon="calendar-outline" label="Bookings" count={vendor.bookings.length} onPress={() => navigateTo('AdminVendorBookings')} />
          <NavRow colors={colors} icon="card-outline" label="Payments" count={vendor.payments.length} onPress={() => navigateTo('AdminVendorPayments')} />
          <NavRow colors={colors} icon="wallet-outline" label="Payouts" count={vendor.payouts.length} badge={vendor.totalDue > 0 ? `LKR ${Math.round(vendor.totalDue).toLocaleString()} due` : undefined} onPress={() => navigateTo('AdminVendorPayouts')} />
        </Section>

        <Section title="Business Registration" colors={colors}>
          {vendor.businessRegistrations.length === 0 ? (
            <Text style={styles.emptyText}>No business registration submitted yet.</Text>
          ) : (
            vendor.businessRegistrations.map((br) => (
              <Card key={br.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{br.businessName}</Text>
                <Text style={styles.rowSub}>Reg. No: {br.registrationNumber}</Text>
                {br.documentUrl ? (
                  <TouchableOpacity onPress={() => Linking.openURL(br.documentUrl!)} style={styles.linkRow}>
                    <Ionicons name="document-attach-outline" size={14} color={colors.primary} />
                    <Text style={styles.linkText}>View certificate</Text>
                  </TouchableOpacity>
                ) : null}
              </Card>
            ))
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

function InfoRow({ colors, icon, label, value }: { colors: ThemeColors; icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const styles = infoStyles(colors);
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function NavRow({
  colors, icon, label, count, badge, onPress,
}: {
  colors: ThemeColors; icon: keyof typeof Ionicons.glyphMap; label: string; count: number; badge?: string; onPress: () => void;
}) {
  const styles = navRowStyles(colors);
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.count}>{count} {count === 1 ? 'item' : 'items'}</Text>
        </View>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    </TouchableOpacity>
  );
}

function Section({ title, colors, children }: { title: string; colors: ThemeColors; children: React.ReactNode }) {
  const styles = sectionStyles(colors);
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const infoStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  label: { ...typography.caption, color: colors.textMuted, width: 78 },
  value: { ...typography.body, color: colors.text, flex: 1, fontWeight: '600' },
});

const navRowStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  iconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.body, fontWeight: '700', color: colors.text },
  count: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  badge: { ...typography.caption, color: colors.warning, fontWeight: '700' },
});

const sectionStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: { marginTop: spacing.lg },
  title: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  profileCard: { alignItems: 'stretch' },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { flexBasis: '47%', flexGrow: 1, marginBottom: 0 },
  rowCard: { paddingVertical: spacing.sm },
  rowTitle: { ...typography.body, fontWeight: '700', color: colors.text },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  linkText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  emptyText: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.sm },
});
