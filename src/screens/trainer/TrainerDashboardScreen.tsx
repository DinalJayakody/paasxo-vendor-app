import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { spacing, radius, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useRoleTheme } from '@/hooks/useRoleTheme';
import { TrainerApi } from '@/api/trainer';
import { NotificationApi } from '@/api/notification';
import { TrainerSession } from '@/types';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenHeader from '@/components/ScreenHeader';
import StatCard from '@/components/StatCard';
import Mascot from '@/components/Mascot';
import ScreenGlow from '@/components/ScreenGlow';
import { useGlassTabBarHeight } from '@/components/GlassTabBar';
import { useAuthStore } from '@/store/authStore';

const CATEGORY_LABELS: Record<string, string> = {
  GYM: 'Gym', BODYBUILDING: 'Bodybuilding', CALISTHENICS: 'Calisthenics', ZUMBA: 'Zumba', DANCING: 'Dancing', YOGA: 'Yoga',
  CROSSFIT: 'CrossFit', MARTIAL_ARTS: 'Martial Arts', PILATES: 'Pilates', OTHER: 'Training',
};

export default function TrainerDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const tabBarHeight = useGlassTabBarHeight();
  const user = useAuthStore((s) => s.user);
  const palette = useRoleTheme();

  const {
    data: profile, isLoading: loadingProfile, refetch: refetchProfile, isRefetching: refetchingProfile,
  } = useQuery({ queryKey: ['trainer-profile', 'mine'], queryFn: TrainerApi.getMyProfile, retry: false });
  const {
    data: sessions, isLoading: loadingSessions, refetch: refetchSessions, isRefetching: refetchingSessions,
  } = useQuery({ queryKey: ['trainer-sessions', 'mine'], queryFn: TrainerApi.getMySessions, enabled: !!profile });
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'], queryFn: NotificationApi.unreadCount, refetchInterval: 15000,
  });

  const isLoading = loadingProfile || (!!profile && loadingSessions);
  const isRefetching = refetchingProfile || refetchingSessions;
  const refetch = () => { refetchProfile(); if (profile) refetchSessions(); };

  const hasProfile = !!profile;
  const sessionList: TrainerSession[] = sessions ?? [];
  const activeSessions = sessionList.filter((s) => s.active).length;
  const totalCapacity = sessionList.reduce((sum, s) => sum + s.capacity, 0);

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
        title={user?.displayName ?? 'Trainer'}
        subtitle="Welcome back — here's your coaching overview."
        heroColors={[palette.heroStart, palette.heroMid, palette.heroEnd]}
        rightElement={
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} activeOpacity={0.8} style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={20} color={colors.white} />
            {!!unreadCount && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      >
        {hasProfile && (
          <PrimaryButton
            title="New Session"
            icon="add-circle-outline"
            variant="ghost"
            onPress={() => navigation.navigate('CreateSession')}
            style={styles.addBtn}
          />
        )}
      </ScreenHeader>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.accent} colors={[palette.accent]} />}
      >
        {!hasProfile ? (
          <Animated.View entering={FadeIn.duration(450)}>
            <Card style={styles.setupCard}>
              <Mascot pose="cheer" size={110} accentColors={['#FFB27A', palette.accent, palette.accentDark]} />
              <Text style={styles.setupTitle}>Set up your trainer profile</Text>
              <Text style={styles.setupBody}>
                Add your specialties, bio, and hourly rate so users can find and book your sessions.
              </Text>
              <PrimaryButton
                title="Create Trainer Profile"
                onPress={() => navigation.navigate('EditTrainerProfile')}
                style={{ marginTop: spacing.md, backgroundColor: palette.accent, shadowColor: palette.accent }}
              />
            </Card>
          </Animated.View>
        ) : (
          <>
            <StatCard icon="barbell" label="Active Sessions" value={activeSessions} accent={palette.accent} delay={0} />
            <StatCard icon="people-outline" label="Total Weekly Capacity" value={totalCapacity} accent={colors.teal} delay={60} />
            <StatCard icon="star-outline" label="Specialties" value={profile.categories?.length ?? 0} accent={colors.premium} delay={120} />

            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('AllDates')}>
              <Card style={styles.sessionCard}>
                <View style={[styles.sessionIconBadge, { backgroundColor: palette.accentLight }]}>
                  <Ionicons name="calendar" size={20} color={palette.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle}>All Dates</Text>
                  <Text style={styles.sessionMeta}>See every upcoming date across your sessions, and who's joined</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Card>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('TrainerPlans')}>
              <Card style={styles.sessionCard}>
                <View style={[styles.sessionIconBadge, { backgroundColor: palette.accentLight }]}>
                  <Ionicons name="clipboard" size={20} color={palette.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle}>Plans & Memberships</Text>
                  <Text style={styles.sessionMeta}>Sell workout plans, diet plans and monthly or annual memberships</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Card>
            </TouchableOpacity>

            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>My Sessions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('EditTrainerProfile')}>
                <Text style={[styles.editLink, { color: palette.accent }]}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {sessionList.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={28} color={palette.accent} />
                <Text style={styles.emptyTitle}>No sessions yet</Text>
                <Text style={styles.emptyBody}>Create your first training session to start accepting bookings.</Text>
                <PrimaryButton
                  title="+ Create Session"
                  onPress={() => navigation.navigate('CreateSession')}
                  style={{ marginTop: spacing.md, backgroundColor: palette.accent, shadowColor: palette.accent }}
                />
              </Card>
            ) : (
              sessionList.slice(0, 4).map((session, index) => (
                <Animated.View key={session.id} entering={FadeInDown.duration(400).delay(index * 80).springify()}>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}>
                    <Card style={styles.sessionCard}>
                      <View style={[styles.sessionIconBadge, { backgroundColor: palette.accentLight }]}>
                        <Ionicons name="barbell-outline" size={20} color={palette.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sessionTitle} numberOfLines={1}>{session.title}</Text>
                        <Text style={styles.sessionMeta}>
                          {CATEGORY_LABELS[session.category] ?? session.category} · {session.daysOfWeek.length} day{session.daysOfWeek.length === 1 ? '' : 's'}/wk · LKR {session.price}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </Card>
                  </TouchableOpacity>
                </Animated.View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bellBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.heroStart,
  },
  bellBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  addBtn: { alignSelf: 'flex-start', marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  scroll: { padding: spacing.md },
  setupCard: { alignItems: 'center', textAlign: 'center', paddingVertical: spacing.lg },
  setupTitle: { ...typography.h3, color: colors.text, marginTop: spacing.sm, textAlign: 'center' },
  setupBody: { ...typography.body, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { ...typography.h1, fontSize: 20, color: colors.text },
  editLink: { fontWeight: '700', fontSize: 13 },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.lg },
  emptyTitle: { ...typography.h3, color: colors.text, marginTop: spacing.sm },
  emptyBody: { ...typography.body, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  sessionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sessionIconBadge: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  sessionTitle: { fontWeight: '700', color: colors.text, fontSize: 15 },
  sessionMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
