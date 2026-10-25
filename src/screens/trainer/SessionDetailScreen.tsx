import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useRoleTheme } from '@/hooks/useRoleTheme';
import { TrainerApi } from '@/api/trainer';
import { TrainerSessionSlot } from '@/types';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import EmptyState from '@/components/EmptyState';
import ScreenGlow from '@/components/ScreenGlow';
import PromotionEditor from '@/components/PromotionEditor';
import { TrainerSession } from '@/types';

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function SessionDetailScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { sessionId } = route.params;
  const palette = useRoleTheme();
  const queryClient = useQueryClient();
  const applySession = (updated: TrainerSession) => {
    queryClient.setQueryData(['trainer-session', sessionId], updated);
    queryClient.invalidateQueries({ queryKey: ['trainer-sessions'] });
  };
  const today = todayIso();
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ['trainer-session', sessionId],
    queryFn: () => TrainerApi.getSessionById(sessionId),
  });
  const { data: slots, isLoading: loadingSlots } = useQuery({
    queryKey: ['trainer-session-slots', sessionId, today, in30Days],
    queryFn: () => TrainerApi.getSlots(sessionId, today, in30Days),
  });

  if (loadingSession || !session) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={palette.accent} size="large" />
      </SafeAreaView>
    );
  }

  const upcomingSlots: TrainerSessionSlot[] = (slots ?? []).filter((s: TrainerSessionSlot) => s.status !== 'CANCELLED').slice(0, 8);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenGlow />
      <ScrollView>
        <View style={styles.heroWrap}>
          {session.imageUrl ? (
            <Image source={{ uri: session.imageUrl }} style={styles.hero} />
          ) : (
            <View style={[styles.hero, { backgroundColor: palette.accentDark }]} />
          )}
          <View style={styles.heroScrim} />
          <TouchableOpacity style={styles.backFab} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.editFab} onPress={() => navigation.navigate('CreateSession', { sessionId })} hitSlop={8}>
            <Ionicons name="pencil" size={16} color={colors.text} />
          </TouchableOpacity>
          <Animated.View entering={FadeInUp.duration(450).springify()} style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>{session.title}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="pricetag" size={13} color="#FFE8D9" />
              <Text style={styles.heroMeta}>{CATEGORY_LABELS[session.category] ?? session.category} · LKR {session.price}</Text>
            </View>
          </Animated.View>
        </View>

        <View style={styles.body}>
          <Animated.View entering={FadeIn.duration(400).delay(80)}>
            <Card>
              <Text style={styles.sectionTitle}>Details</Text>
              <Text style={styles.description}>{session.description || 'No description added yet.'}</Text>
              <View style={styles.factRow}>
                <View style={[styles.factChip, { backgroundColor: palette.accentLight }]}>
                  <Ionicons name="time-outline" size={14} color={palette.accent} />
                  <Text style={[styles.factChipText, { color: palette.accentDark }]}>{timeLabel(session.startTime)} · {session.durationMinutes}min</Text>
                </View>
                <View style={[styles.factChip, { backgroundColor: palette.accentLight }]}>
                  <Ionicons name="people-outline" size={14} color={palette.accent} />
                  <Text style={[styles.factChipText, { color: palette.accentDark }]}>{session.capacity} spots</Text>
                </View>
                <View style={[styles.factChip, { backgroundColor: palette.accentLight }]}>
                  <Ionicons name={session.isOnline ? 'videocam-outline' : 'location-outline'} size={14} color={palette.accent} />
                  <Text style={[styles.factChipText, { color: palette.accentDark }]}>{session.isOnline ? 'Online' : (session.location || 'In person')}</Text>
                </View>
              </View>
              <Text style={styles.scheduleText}>
                Repeats {session.daysOfWeek.map((d: string) => DAY_SHORT[d] ?? d).join(', ')}
              </Text>
              {!!session.planDetails && (
                <View style={styles.planBox}>
                  <Text style={styles.planLabel}>Diet / Workout Plan</Text>
                  <Text style={styles.planText}>{session.planDetails}</Text>
                </View>
              )}
            </Card>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(120)}>
            <Card>
              <Text style={styles.sectionTitle}>Discount</Text>
              <Text style={styles.description}>Offer a limited-time price to fill spots. Clients see it when they book.</Text>
              <View style={{ marginTop: spacing.md }}>
                <PromotionEditor
                  value={session.promotion}
                  basePrice={session.price}
                  priceSuffix=" / session"
                  accent={palette.accent}
                  onSave={async (p) => applySession(await TrainerApi.setSessionPromotion(sessionId, p))}
                  onClear={async () => applySession(await TrainerApi.clearSessionPromotion(sessionId))}
                />
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(160)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Upcoming Dates</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ManageSessionAvailability', { sessionId })}>
                  <Text style={[styles.editLink, { color: palette.accent }]}>Manage</Text>
                </TouchableOpacity>
              </View>
              {loadingSlots ? (
                <ActivityIndicator color={palette.accent} style={{ marginTop: spacing.sm }} />
              ) : upcomingSlots.length === 0 ? (
                <EmptyState
                  pose="sit"
                  title="No dates generated"
                  message="Generate bookable dates so users can join this session."
                  style={{ paddingVertical: spacing.md }}
                />
              ) : (
                upcomingSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={styles.slotRow}
                    onPress={() => navigation.navigate('SessionRoster', { sessionId, slotId: slot.id, slotDate: slot.slotDate })}
                  >
                    <View style={[styles.slotDateBadge, { backgroundColor: palette.accentLight }]}>
                      <Text style={[styles.slotDateDay, { color: palette.accent }]}>{slot.slotDate.slice(8, 10)}</Text>
                      <Text style={[styles.slotDateMonth, { color: palette.accent }]}>{slot.slotDate.slice(5, 7)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.slotTime}>{timeLabel(slot.startTime)}–{timeLabel(slot.endTime)}</Text>
                      <Text style={styles.slotSpots}>
                        {slot.status === 'FULL' ? 'Full' : `${slot.spotsLeft} of ${slot.capacity} spots left`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))
              )}
            </Card>
          </Animated.View>

          <PrimaryButton
            title="Manage Availability"
            icon="calendar-outline"
            onPress={() => navigation.navigate('ManageSessionAvailability', { sessionId })}
            style={{ marginTop: spacing.sm, marginBottom: spacing.xl, backgroundColor: palette.accent, shadowColor: palette.accent }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  heroWrap: { height: 220, backgroundColor: colors.border },
  hero: { width: '100%', height: '100%' },
  heroScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, backgroundColor: 'rgba(15,42,68,0.55)' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md },
  heroTitle: { ...typography.h2, color: colors.white },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  heroMeta: { color: '#FFE8D9' },
  // colors.glassStrong (not a hardcoded white) — flips to a dark tint in dark mode
  // so the colors.text icon on top (light in dark mode) stays visible instead of
  // landing on a plain white disc. Same fix as VenueDetailScreen's backFab/editFab.
  backFab: {
    position: 'absolute', top: spacing.md, left: spacing.md, backgroundColor: colors.glassStrong,
    width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  editFab: {
    position: 'absolute', top: spacing.md, right: spacing.md, backgroundColor: colors.glassStrong,
    width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  body: { padding: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typography.h3, color: colors.text },
  editLink: { fontWeight: '600' },
  description: { color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  factChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  factChipText: { fontWeight: '600' },
  scheduleText: { color: colors.text, fontWeight: '600', marginTop: spacing.sm, fontSize: 13 },
  planBox: { marginTop: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md },
  planLabel: { ...typography.label, color: colors.textMuted, marginBottom: 4 },
  planText: { color: colors.text, lineHeight: 19 },
  slotRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm,
  },
  slotDateBadge: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  slotDateDay: { fontWeight: '800', fontSize: 15, lineHeight: 18 },
  slotDateMonth: { fontWeight: '600', fontSize: 10, textTransform: 'uppercase' },
  slotTime: { fontWeight: '700', color: colors.text },
  slotSpots: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
