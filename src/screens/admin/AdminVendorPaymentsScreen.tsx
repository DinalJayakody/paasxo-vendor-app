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

/** Every payment transaction across this vendor's bookings — reached from AdminVendorDetailScreen. */
export default function AdminVendorPaymentsScreen({ route, navigation }: any) {
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
      <ScreenHeader title="Payments" subtitle={`${vendor.displayName} · LKR ${Math.round(vendor.totalRevenue).toLocaleString()} total`} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {vendor.payments.length === 0 ? (
          <EmptyState title="No payments yet" message="Successful customer payments will show up here." />
        ) : (
          vendor.payments.map((payment) => (
            <Card key={payment.id} style={styles.card}>
              <View style={styles.topLine}>
                <Text style={styles.title} numberOfLines={1}>{payment.customerName}</Text>
                <StatusBadge status={payment.status} />
              </View>
              <Text style={styles.sub}>{payment.sport} · {payment.dateRange}</Text>
              <Text style={styles.price}>LKR {Math.round(payment.amount).toLocaleString()}</Text>
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
