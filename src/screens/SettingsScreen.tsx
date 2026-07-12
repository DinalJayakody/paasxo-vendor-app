import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenHeader from '@/components/ScreenHeader';

interface RowDef {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  color?: string;
  onPress: () => void;
}

export default function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();

  const rows: RowDef[] = [
    {
      key: 'subscription', icon: 'card-outline', label: 'Subscription & Billing',
      sub: 'Manage your plan and payment method', color: colors.primary,
      onPress: () => navigation.navigate('Subscription'),
    },
    {
      key: 'notifications', icon: 'notifications-outline', label: 'Notification Preferences',
      sub: 'Bookings, payments & alerts', color: colors.teal,
      onPress: () => Alert.alert('Coming soon', 'Notification preferences are on the way.'),
    },
    {
      key: 'staff', icon: 'people-outline', label: 'Staff Management',
      sub: 'Invite and manage venue staff', color: colors.premium,
      onPress: () => Alert.alert('Coming soon', 'Staff management is on the way.'),
    },
    {
      key: 'help', icon: 'help-circle-outline', label: 'Help & Support',
      sub: 'FAQs and contact support', color: colors.info,
      onPress: () => Alert.alert('Help & Support', 'Reach us at support@paasxo.com'),
    },
  ];

  return (
    <View style={styles.safe}>
      <ScreenHeader title="Settings" subtitle="Manage your account and business preferences" compact />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInUp.duration(450).springify()}>
          <Card style={styles.profileCard}>
            {user?.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="business" size={26} color={colors.primary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user?.displayName}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              {!!user?.phoneNumber && <Text style={styles.phone}>{user.phoneNumber}</Text>}
            </View>
          </Card>
        </Animated.View>

        {rows.map((row, index) => (
          <Animated.View key={row.key} entering={FadeInUp.duration(400).delay(80 + index * 70).springify()}>
            <TouchableOpacity style={styles.row} onPress={row.onPress} activeOpacity={0.7}>
              <View style={[styles.rowIcon, { backgroundColor: `${row.color}1F` }]}>
                <Ionicons name={row.icon} size={19} color={row.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{row.label}</Text>
                {row.sub ? <Text style={styles.rowSub}>{row.sub}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        ))}

        <PrimaryButton
          title="Log Out"
          icon="log-out-outline"
          variant="outline"
          onPress={() => Alert.alert('Log out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: logout },
          ])}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { ...typography.h3, color: colors.text },
  email: { color: colors.textMuted, marginTop: 2 },
  phone: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm,
    shadowColor: colors.primary, shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
});
