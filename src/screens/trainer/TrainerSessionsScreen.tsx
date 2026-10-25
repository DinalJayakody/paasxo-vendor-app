import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { spacing, radius, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useRoleTheme } from '@/hooks/useRoleTheme';
import { TrainerApi } from '@/api/trainer';
import { TrainerSession } from '@/types';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/EmptyState';
import ScreenGlow from '@/components/ScreenGlow';
import { useGlassTabBarHeight } from '@/components/GlassTabBar';

const CATEGORY_LABELS: Record<string, string> = {
  GYM: 'Gym', BODYBUILDING: 'Bodybuilding', CALISTHENICS: 'Calisthenics', ZUMBA: 'Zumba', DANCING: 'Dancing', YOGA: 'Yoga',
  CROSSFIT: 'CrossFit', MARTIAL_ARTS: 'Martial Arts', PILATES: 'Pilates', OTHER: 'Training',
};

const DAY_SHORT: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

function timeLabel(t: string) {
  return t.slice(0, 5);
}

export default function TrainerSessionsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const tabBarHeight = useGlassTabBarHeight();
  const palette = useRoleTheme();
  const { data: sessions, isLoading } = useQuery({ queryKey: ['trainer-sessions', 'mine'], queryFn: TrainerApi.getMySessions });

  const sessionList: TrainerSession[] = sessions ?? [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader
        title="My Sessions"
        subtitle={`${sessionList.length} session${sessionList.length === 1 ? '' : 's'} · manage schedule & bookings`}
        compact
        heroColors={[palette.heroStart, palette.heroMid, palette.heroEnd]}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight }]}>
        {sessionList.length === 0 ? (
          <EmptyState
            pose="sit"
            title="No sessions yet"
            message="Create a session so users can find and join your training program."
            ctaLabel="+ Create Session"
            onCta={() => navigation.navigate('CreateSession')}
          />
        ) : (
          sessionList.map((session, index) => (
            <Animated.View key={session.id} entering={FadeInUp.duration(400).delay(index * 70).springify()}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}>
                <Card style={styles.card}>
                  <View style={[styles.accentBar, { backgroundColor: palette.accent }]} />
                  <View style={styles.body}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.title} numberOfLines={1}>{session.title}</Text>
                      {!session.active && (
                        <View style={styles.inactivePill}><Text style={styles.inactivePillText}>Inactive</Text></View>
                      )}
                    </View>
                    <Text style={styles.meta}>{CATEGORY_LABELS[session.category] ?? session.category} · LKR {session.price} / session</Text>
                    <Text style={styles.meta}>
                      {session.daysOfWeek.map((d) => DAY_SHORT[d] ?? d).join(', ')} · {timeLabel(session.startTime)} · {session.durationMinutes}min
                    </Text>
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: palette.accent }]}
                        onPress={() => navigation.navigate('ManageSessionAvailability', { sessionId: session.id })}
                      >
                        <Ionicons name="calendar-outline" size={14} color={palette.accent} />
                        <Text style={[styles.actionBtnText, { color: palette.accent }]}>Availability</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.border }]}
                        onPress={() => navigation.navigate('CreateSession', { sessionId: session.id })}
                      >
                        <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.actionBtnTextMuted}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {sessionList.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: palette.accent, shadowColor: palette.accent }]}
          onPress={() => navigation.navigate('CreateSession')}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={26} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  card: { flexDirection: 'row', padding: 0, overflow: 'hidden' },
  accentBar: { width: 5 },
  body: { flex: 1, padding: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.h3, color: colors.text, flexShrink: 1 },
  meta: { color: colors.textMuted, fontSize: 12.5, marginTop: 4 },
  inactivePill: { backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  inactivePillText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
  },
  actionBtnText: { fontWeight: '700', fontSize: 12 },
  actionBtnTextMuted: { fontWeight: '700', fontSize: 12, color: colors.textMuted },
  fab: {
    position: 'absolute', right: spacing.lg, bottom: spacing.lg, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
});
