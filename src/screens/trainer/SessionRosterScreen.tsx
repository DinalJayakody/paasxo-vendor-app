import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { radius, spacing, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useRoleTheme } from '@/hooks/useRoleTheme';
import { TrainerApi } from '@/api/trainer';
import { TrainerBooking } from '@/types';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/EmptyState';
import ScreenGlow from '@/components/ScreenGlow';

export default function SessionRosterScreen({ route }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { sessionId, slotId, slotDate } = route.params;
  const palette = useRoleTheme();

  const { data: roster, isLoading } = useQuery({
    queryKey: ['trainer-session-roster', sessionId, slotId],
    queryFn: () => TrainerApi.getRoster(sessionId, slotId),
  });

  const members: TrainerBooking[] = roster ?? [];

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader
        title="Session Roster"
        subtitle={slotDate ? `Members joined for ${slotDate}` : 'Members joined for this date'}
        compact
        heroColors={[palette.heroStart, palette.heroMid, palette.heroEnd]}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <ActivityIndicator color={palette.accent} style={{ marginTop: spacing.lg }} />
        ) : members.length === 0 ? (
          <EmptyState pose="sit" title="No one's joined yet" message="Members who book this date will appear here." />
        ) : (
          members.map((m, index) => (
            <Animated.View key={m.id} entering={FadeInUp.duration(350).delay(index * 60).springify()}>
              <Card style={styles.row}>
                {m.userAvatarUrl ? (
                  <Image source={{ uri: m.userAvatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: palette.accentLight }]}>
                    <Ionicons name="person" size={18} color={palette.accent} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{m.userDisplayName || 'Member'}</Text>
                  <Text style={styles.meta}>Joined {new Date(m.bookedAt).toLocaleDateString()}</Text>
                </View>
                {m.pricePaid != null && <Text style={styles.amount}>LKR {m.pricePaid}</Text>}
              </Card>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  amount: { fontWeight: '800', color: colors.text },
});
