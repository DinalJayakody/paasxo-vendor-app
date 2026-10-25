import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useRoleTheme } from '@/hooks/useRoleTheme';
import { TrainerApi } from '@/api/trainer';
import { TrainerSessionSlot } from '@/types';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/EmptyState';
import CalendarPickerModal from '@/components/CalendarPickerModal';
import ScreenGlow from '@/components/ScreenGlow';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysIso(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function timeLabel(t: string) {
  return t.slice(0, 5);
}

// Fixed row height so FlatList can jump straight to any date via
// getItemLayout (scrollToIndex needs this to be exact, not measured).
const ITEM_HEIGHT = 76;
const ITEM_GAP = spacing.sm;
const ROW_HEIGHT = ITEM_HEIGHT + ITEM_GAP;

export default function ManageSessionAvailabilityScreen({ route }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { sessionId } = route.params;
  const palette = useRoleTheme();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<TrainerSessionSlot>>(null);
  const highlightTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rangeFrom, setRangeFrom] = useState(todayIso());
  const [rangeTo, setRangeTo] = useState(addDaysIso(todayIso(), 13));
  const [pickerFor, setPickerFor] = useState<'from' | 'to' | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [highlightedSlotId, setHighlightedSlotId] = useState<number | null>(null);

  // Deliberately unbounded on the upper end — every generated date, not just
  // a 60-day window. Auto-generation (TrainerSessionService) creates dates
  // through the end of the year on create/update, and "Extend Availability"
  // below can push further out than that; a fixed window was clipping most
  // of them from view. `from` stays pinned to today so past dates (already
  // over, nothing to manage) don't clutter this list.
  const listFrom = todayIso();
  const { data: slots, isLoading } = useQuery({
    queryKey: ['trainer-session-slots', sessionId, listFrom],
    queryFn: () => TrainerApi.getSlots(sessionId, listFrom),
  });

  const generateMutation = useMutation({
    mutationFn: () => TrainerApi.generateSlots(sessionId, rangeFrom, rangeTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-session-slots', sessionId] });
      Alert.alert('Availability generated', 'Bookable dates have been added for the selected range.');
    },
    onError: (e: any) => Alert.alert('Could not generate availability', e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please try again'),
  });

  const apiError = (e: any, fallback: string) => e?.response?.data?.error ?? e?.response?.data?.message ?? fallback;

  const cancelMutation = useMutation({
    mutationFn: (slotId: number) => TrainerApi.cancelSlot(sessionId, slotId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-session-slots', sessionId] }),
    onError: (e: any) => Alert.alert('Could not cancel this date', apiError(e, 'Please try again.')),
  });

  const reopenMutation = useMutation({
    mutationFn: (slotId: number) => TrainerApi.reopenSlot(sessionId, slotId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-session-slots', sessionId] }),
    onError: (e: any) => Alert.alert('Could not reopen this date', apiError(e, 'Please try again.')),
  });

  // Cancelled dates stay listed (dimmed) so they can be reopened.
  const activeSlots: TrainerSessionSlot[] = useMemo(
    () => [...(slots ?? [])].sort((a, b) => (a.slotDate + a.startTime).localeCompare(b.slotDate + b.startTime)),
    [slots]
  );
  const openCount = useMemo(() => activeSlots.filter((s) => s.status !== 'CANCELLED').length, [activeSlots]);

  const markedDates = useMemo(
    () => new Set(activeSlots.filter((s) => s.status !== 'CANCELLED').map((s) => s.slotDate)),
    [activeSlots]
  );

  useEffect(() => () => { if (highlightTimeout.current) clearTimeout(highlightTimeout.current); }, []);

  // Jumps the list to the tapped calendar date. Tapping a day with no
  // generated slot (unmarked days are still tappable) lands on the nearest
  // upcoming date instead of doing nothing, since that's almost always what
  // someone browsing the calendar actually wants.
  const handleCalendarSelect = useCallback((date: string) => {
    setCalendarVisible(false);
    const index = activeSlots.findIndex((s) => s.slotDate >= date && s.status !== 'CANCELLED');
    if (index === -1) return;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.25 });
    setHighlightedSlotId(activeSlots[index].id);
    if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
    highlightTimeout.current = setTimeout(() => setHighlightedSlotId(null), 1800);
  }, [activeSlots]);

  const renderSlot = ({ item, index }: { item: TrainerSessionSlot; index: number }) => {
    const highlighted = item.id === highlightedSlotId;
    const cancelled = item.status === 'CANCELLED';
    return (
      <Animated.View
        entering={FadeInUp.duration(300).delay(Math.min(index, 8) * 40).springify()}
        style={{ height: ITEM_HEIGHT, marginBottom: ITEM_GAP }}
      >
        <Card style={[styles.slotCard, highlighted && { borderColor: palette.accent, borderWidth: 1.5 }]}>
          <View style={[styles.slotDateBadge, { backgroundColor: palette.accentLight }]}>
            <Text style={[styles.slotDateDay, { color: palette.accent }]}>{item.slotDate.slice(8, 10)}</Text>
            <Text style={[styles.slotDateMonth, { color: palette.accent }]}>{item.slotDate.slice(5, 7)}</Text>
          </View>
          <View style={{ flex: 1, opacity: cancelled ? 0.55 : 1 }}>
            <Text style={[styles.slotTime, cancelled && { textDecorationLine: 'line-through' }]}>
              {timeLabel(item.startTime)}–{timeLabel(item.endTime)}
            </Text>
            <Text style={[styles.slotSpots, cancelled && { color: colors.danger }]}>
              {cancelled ? 'Cancelled' : item.status === 'FULL' ? 'Full' : `${item.spotsLeft} of ${item.capacity} spots left`}
            </Text>
          </View>
          {cancelled ? (
            <TouchableOpacity
              style={[styles.reopenBtn, { borderColor: palette.accent }]}
              hitSlop={8}
              disabled={reopenMutation.isPending}
              onPress={() => Alert.alert('Reopen this date?', 'It goes back on sale and clients can book it again.', [
                { text: 'Not now', style: 'cancel' },
                { text: 'Reopen', onPress: () => reopenMutation.mutate(item.id) },
              ])}
              accessibilityRole="button"
              accessibilityLabel="Reopen date"
            >
              {reopenMutation.isPending && reopenMutation.variables === item.id
                ? <ActivityIndicator size="small" color={palette.accent} />
                : <Text style={[styles.reopenText, { color: palette.accent }]}>Reopen</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.cancelBtn}
              hitSlop={8}
              onPress={() => Alert.alert(
                'Cancel this date?',
                item.capacity - item.spotsLeft > 0
                  ? 'Everyone booked on this date gets a full refund and a notification. You can reopen it later.'
                  : 'No one can book it until you reopen it.',
                [
                  { text: 'Keep', style: 'cancel' },
                  { text: 'Cancel Date', style: 'destructive', onPress: () => cancelMutation.mutate(item.id) },
                ],
              )}
              accessibilityRole="button"
              accessibilityLabel="Cancel date"
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          )}
        </Card>
      </Animated.View>
    );
  };

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader
        title="Manage Availability"
        subtitle="Dates are generated automatically — extend below if needed"
        compact
        heroColors={[palette.heroStart, palette.heroMid, palette.heroEnd]}
      />
      <FlatList
        ref={listRef}
        data={activeSlots}
        keyExtractor={(s) => String(s.id)}
        renderItem={renderSlot}
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.25 }), 250);
        }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Card>
              <Text style={styles.sectionTitle}>Extend Availability</Text>
              <Text style={styles.hint}>
                Bookable dates for this session's weekly schedule are created automatically through the end of the year —
                no need to generate them yourself. Use this only to add dates further out, or to top up after changing the schedule.
              </Text>
              <View style={styles.rangeRow}>
                <TouchableOpacity style={styles.dateField} onPress={() => setPickerFor('from')}>
                  <Ionicons name="calendar-outline" size={16} color={palette.accent} />
                  <Text style={styles.dateText}>{rangeFrom}</Text>
                </TouchableOpacity>
                <Text style={styles.toText}>to</Text>
                <TouchableOpacity style={styles.dateField} onPress={() => setPickerFor('to')}>
                  <Ionicons name="calendar-outline" size={16} color={palette.accent} />
                  <Text style={styles.dateText}>{rangeTo}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.quickRow}>
                <TouchableOpacity style={styles.quickBtn} onPress={() => { setRangeFrom(todayIso()); setRangeTo(addDaysIso(todayIso(), 6)); }}>
                  <Text style={[styles.quickBtnText, { color: palette.accent }]}>Next 7 days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => { setRangeFrom(todayIso()); setRangeTo(addDaysIso(todayIso(), 29)); }}>
                  <Text style={[styles.quickBtnText, { color: palette.accent }]}>Next 30 days</Text>
                </TouchableOpacity>
              </View>
              <PrimaryButton
                title="Extend Availability"
                onPress={() => generateMutation.mutate()}
                loading={generateMutation.isPending}
                style={{ marginTop: spacing.md, backgroundColor: palette.accent, shadowColor: palette.accent }}
              />
            </Card>

            <View style={styles.listTitleRow}>
              <Text style={styles.listTitle}>
                Upcoming Dates{openCount > 0 ? ` (${openCount})` : ''}
              </Text>
              {activeSlots.length > 0 && (
                <TouchableOpacity
                  style={[styles.calendarBtn, { borderColor: palette.accent }]}
                  onPress={() => setCalendarVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar" size={14} color={palette.accent} />
                  <Text style={[styles.calendarBtnText, { color: palette.accent }]}>Calendar</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoading && (
              <ActivityIndicator color={palette.accent} style={{ marginTop: spacing.md }} />
            )}
          </>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState pose="sit" title="No dates yet" message="Generate availability above to create bookable dates." />
          )
        }
      />

      <CalendarPickerModal
        visible={pickerFor !== null}
        selectedDate={pickerFor === 'from' ? rangeFrom : rangeTo}
        minDate={pickerFor === 'to' ? rangeFrom : todayIso()}
        onClose={() => setPickerFor(null)}
        onSelect={(date) => {
          if (pickerFor === 'from') {
            setRangeFrom(date);
            if (date > rangeTo) setRangeTo(date);
          } else if (pickerFor === 'to') {
            setRangeTo(date);
          }
          setPickerFor(null);
        }}
      />

      <CalendarPickerModal
        visible={calendarVisible}
        selectedDate={activeSlots.find((s) => s.status !== 'CANCELLED')?.slotDate ?? todayIso()}
        markedDates={markedDates}
        minDate={todayIso()}
        onClose={() => setCalendarVisible(false)}
        onSelect={handleCalendarSelect}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: { ...typography.h3, color: colors.text },
  hint: { color: colors.textMuted, fontSize: 12.5, marginTop: 4, marginBottom: spacing.sm, lineHeight: 17 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateField: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.background,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  dateText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  toText: { color: colors.textMuted, fontSize: 12 },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  quickBtn: { paddingVertical: 6 },
  quickBtnText: { fontWeight: '700', fontSize: 12.5 },
  listTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  listTitle: { ...typography.h1, fontSize: 18, color: colors.text },
  calendarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  calendarBtnText: { fontSize: 12.5, fontWeight: '700' },
  slotCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 0, borderWidth: 1.5, borderColor: 'transparent' },
  slotDateBadge: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  slotDateDay: { fontWeight: '800', fontSize: 15, lineHeight: 18 },
  slotDateMonth: { fontWeight: '600', fontSize: 10, textTransform: 'uppercase' },
  slotTime: { fontWeight: '700', color: colors.text },
  slotSpots: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  reopenBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1.5, minWidth: 74, alignItems: 'center' },
  reopenText: { fontSize: 12.5, fontWeight: '700' },
  cancelBtn: { padding: 4 },
});
