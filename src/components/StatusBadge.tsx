import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

function statusMeta(colors: ThemeColors): Record<string, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> {
  return {
    ACTIVE: { bg: colors.successLight, text: colors.success, icon: 'checkmark-circle' },
    // Vendor pending manual verification, or deactivated by an admin — see
    // AdminVendorListScreen/AdminVendorDetailScreen.
    INACTIVE: { bg: colors.dangerLight, text: colors.danger, icon: 'close-circle-outline' },
    PENDING: { bg: colors.warningLight, text: colors.warning, icon: 'time-outline' },
    PENDING_VENDOR: { bg: colors.warningLight, text: colors.warning, icon: 'hourglass-outline' },
    ACTIVE_MATCH: { bg: colors.successLight, text: colors.success, icon: 'checkmark-circle' },
    APPROVED: { bg: colors.primarySoft, text: colors.primaryDark, icon: 'checkmark-done' },
    CONFIRMED: { bg: colors.primarySoft, text: colors.primaryDark, icon: 'checkmark-done' },
    PAID: { bg: colors.successLight, text: colors.success, icon: 'checkmark-circle' },
    DUE: { bg: colors.warningLight, text: colors.warning, icon: 'time-outline' },
    VOIDED: { bg: colors.background, text: colors.textMuted, icon: 'close-circle-outline' },
    REJECTED: { bg: colors.dangerLight, text: colors.danger, icon: 'close-circle' },
    CANCELLED: { bg: colors.dangerLight, text: colors.danger, icon: 'close-circle' },
    FAILED: { bg: colors.dangerLight, text: colors.danger, icon: 'alert-circle' },
    REFUNDED: { bg: '#F3E8FF', text: '#7E22CE', icon: 'arrow-undo' },
    COMPLETED: { bg: colors.primarySoft, text: colors.primaryDark, icon: 'checkmark-done' },
    DRAFT: { bg: colors.background, text: colors.textMuted, icon: 'document-outline' },
  };
}

export default function StatusBadge({ status }: { status: string }) {
  const { colors } = useTheme();
  const meta = statusMeta(colors)[status] ?? { bg: colors.background, text: colors.textMuted, icon: 'ellipse-outline' as const };
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Ionicons name={meta.icon} size={12} color={meta.text} style={styles.icon} />
      <Text style={[styles.text, { color: meta.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  icon: { marginRight: 4 },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
