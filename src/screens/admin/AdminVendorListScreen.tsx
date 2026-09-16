import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { AdminVendorSummary } from '@/types';
import { AdminVendorApi } from '@/api/admin';
import { useAuthStore } from '@/store/authStore';
import ScreenGlow from '@/components/ScreenGlow';
import ScreenHeader from '@/components/ScreenHeader';
import Card from '@/components/Card';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import FormInput from '@/components/FormInput';
import EmptyState from '@/components/EmptyState';

/** Admin Console home — every vendor account, searchable, with an at-a-glance
 *  verification queue. Tap a row to review + activate/deactivate (see
 *  AdminVendorDetailScreen). Reached only by the info@paasxo.com admin
 *  identity — see RootNavigator's isAdmin branch. */
export default function AdminVendorListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const logout = useAuthStore((s) => s.logout);
  const [search, setSearch] = useState('');

  const { data: vendors, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'vendors'],
    queryFn: AdminVendorApi.list,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = vendors ?? [];
    if (!q) return all;
    return all.filter((v) =>
      v.displayName?.toLowerCase().includes(q)
      || v.email?.toLowerCase().includes(q)
      || v.phoneNumber?.toLowerCase().includes(q));
  }, [vendors, search]);

  const totalVendors = vendors?.length ?? 0;
  const pendingCount = (vendors ?? []).filter((v) => !v.active).length;
  const activeCount = (vendors ?? []).filter((v) => v.active).length;
  const totalDueAcrossVendors = (vendors ?? []).reduce((sum, v) => sum + v.totalDue, 0);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Sign out of the Paasxo Admin console?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

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
        title="Admin Console"
        subtitle="Review and manage every Paasxo vendor"
        rightElement={
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.8} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={styles.statsRow}>
          <StatCard icon="storefront-outline" label="Total Vendors" value={totalVendors} style={styles.statCard} />
          <StatCard icon="time-outline" label="Pending" value={pendingCount} accent={colors.warning} style={styles.statCard} />
          <StatCard icon="checkmark-circle-outline" label="Active" value={activeCount} accent={colors.success} style={styles.statCard} />
          <StatCard icon="cash-outline" label="Total Due" value={totalDueAcrossVendors} accent={colors.info} prefix="LKR " decimals={0} style={styles.statCard} />
        </View>

        <FormInput
          icon="search-outline"
          placeholder="Search by name, email or phone"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />

        {filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No matching vendors' : 'No vendors yet'}
            message={search ? 'Try a different search.' : 'New vendor registrations will show up here for verification.'}
          />
        ) : (
          filtered.map((vendor) => (
            <VendorRow key={vendor.firebaseUid} vendor={vendor} colors={colors}
              onPress={() => navigation.navigate('AdminVendorDetail', { firebaseUid: vendor.firebaseUid })} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function VendorRow({ vendor, colors, onPress }: { vendor: AdminVendorSummary; colors: ThemeColors; onPress: () => void }) {
  const styles = rowStyles(colors);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.topRow}>
          {vendor.profileImageUrl ? (
            <Image source={{ uri: vendor.profileImageUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="storefront-outline" size={18} color={colors.primary} />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{vendor.displayName}</Text>
            <Text style={styles.email} numberOfLines={1}>{vendor.email}</Text>
          </View>
          <StatusBadge status={vendor.active ? 'ACTIVE' : 'INACTIVE'} />
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="business-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{vendor.venueCount} venue{vendor.venueCount === 1 ? '' : 's'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{vendor.bookingCount} booking{vendor.bookingCount === 1 ? '' : 's'}</Text>
          </View>
          {vendor.totalDue > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={13} color={colors.warning} />
              <Text style={[styles.metaText, { color: colors.warning, fontWeight: '700' }]}>
                LKR {Math.round(vendor.totalDue).toLocaleString()} due
              </Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const rowStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { paddingVertical: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { ...typography.body, fontWeight: '700', color: colors.text },
  email: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.caption, color: colors.textMuted },
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { flexBasis: '47%', flexGrow: 1, marginBottom: spacing.sm },
  logoutBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
