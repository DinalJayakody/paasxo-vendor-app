import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/EmptyState';
import ScreenGlow from '@/components/ScreenGlow';
import { NotificationApi } from '@/api/notification';
import { VendorNotification } from '@/types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'BOOKING_PENDING_VENDOR_APPROVAL': return 'hourglass-outline';
    default: return 'notifications-outline';
  }
}

/** Vendor's in-app notification feed — same shared backend feed the User App reads,
 *  scoped to this vendor's Firebase UID (new booking requests land here). */
export default function NotificationsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: NotificationApi.all,
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => NotificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => NotificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const notifications: VendorNotification[] = data ?? [];
  const unreadCount = notifications.filter((n: VendorNotification) => !n.read).length;

  const handlePress = (n: VendorNotification) => {
    if (!n.read) markReadMutation.mutate(n.id);
    if (n.type === 'BOOKING_PENDING_VENDOR_APPROVAL' && n.bookingId) {
      navigation.navigate('BookingRequestDetail', { bookingId: n.bookingId });
    }
  };

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up'}
        onBack={() => navigation.goBack()}
        compact
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={() => markAllReadMutation.mutate()} activeOpacity={0.8}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      >
        {/* Small guide line — this is the vendor's own inbox, distinct from the
            player app's Feed/Explore notification bells, so it's worth spelling
            out what actually lands here. */}
        <Text style={styles.guideText}>New booking requests and venue updates land here</Text>
      </ScreenHeader>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {notifications.length === 0 ? (
            <EmptyState
              pose="sit"
              title="No notifications yet"
              message="New booking requests and updates will show up here."
            />
          ) : (
            notifications.map((n: VendorNotification, index: number) => (
              <Animated.View key={n.id} entering={FadeInUp.duration(350).delay(index * 60).springify()}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => handlePress(n)}>
                  <Card style={[styles.notifCard, !n.read && styles.notifCardUnread]}>
                    <View style={[styles.iconWrap, !n.read && styles.iconWrapUnread]}>
                      <Ionicons
                        name={notificationIcon(n.type)}
                        size={18}
                        color={!n.read ? colors.warning : colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.title, !n.read && styles.titleUnread]} numberOfLines={1}>
                          {n.title}
                        </Text>
                        {!n.read && <View style={styles.dot} />}
                      </View>
                      <Text style={styles.body} numberOfLines={2}>{n.body}</Text>
                      <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.md },
  markAllText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  guideText: { ...typography.caption, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  notifCard: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginBottom: spacing.sm },
  notifCardUnread: { borderWidth: 1, borderColor: colors.warning + '40', backgroundColor: colors.warningLight + '55' },
  iconWrap: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.border,
  },
  iconWrapUnread: { backgroundColor: colors.warningLight },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { ...typography.body, fontWeight: '600', color: colors.text, flexShrink: 1 },
  titleUnread: { fontWeight: '800' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warning },
  body: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  time: { ...typography.caption, color: colors.textMuted, marginTop: 4, fontSize: 11 },
});
