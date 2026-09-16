import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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

export default function ManageSessionAvailabilityScreen({ route }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { sessionId } = route.params;
  const palette = useRoleTheme();
  const queryClient = useQueryClient();

  const [rangeFrom, setRangeFrom] = useState(todayIso());
  const [rangeTo, setRangeTo] = useState(addDaysIso(todayIso(), 13));
  const [pickerFor, setPickerFor] = useState<'from' | 'to' | null>(null);

  const listFrom = todayIso();
  const listTo = addDaysIso(todayIso(), 60);
  const { data: slots, isLoading } = useQuery({
    queryKey: ['trainer-session-slots', sessionId, listFrom, listTo],
    queryFn: () => TrainerApi.getSlots(sessionId, listFrom, listTo),
  });

  const generateMutation = useMutation({
    mutationFn: () => TrainerApi.generateSlots(sessionId, rangeFrom, rangeTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-session-slots', sessionId] });
      Alert.alert('Availability generated', 'Bookable dates have been added for the selected range.');
    },
    onError: (e: any) => Alert.alert('Could not generate availability', e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please try again'),
  });

  const cancelMutation = useMutation({
    mutationFn: (slotId: number) => TrainerApi.cancelSlot(sessionId, slotId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-session-slots', sessionId] }),
    onError: () => Alert.alert('Error', 'Could not cancel this date'),
  });

  const activeSlots: TrainerSessionSlot[] = (slots ?? []).filter((s: TrainerSessionSlot) => s.status !== 'CANCELLED');

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader
        title="Manage Availability"
        subtitle="Generate the dates users can book"
        compact
        heroColors={[palette.heroStart, palette.heroMid, palette.heroEnd]}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <Text style={styles.sectionTitle}>Generate Dates</Text>
          <Text style={styles.hint}>Creates a bookable date for every day in this range that matches the session's weekly schedule.</Text>
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
            title="Generate Availability"
            onPress={() => generateMutation.mutate()}
            loading={generateMutation.isPending}
            style={{ marginTop: spacing.md, backgroundColor: palette.accent, shadowColor: palette.accent }}
          />
        </Card>

        <Text style={styles.listTitle}>Upcoming Dates</Text>
        {isLoading ? (
          <ActivityIndicator color={palette.accent} style={{ marginTop: spacing.md }} />
        ) : activeSlots.length === 0 ? (
          <EmptyState pose="sit" title="No dates yet" message="Generate availability above to create bookable dates." />
        ) : (
          activeSlots.map((slot, index) => (
            <Animated.View key={slot.id} entering={FadeInUp.duration(350).delay(index * 50).springify()}>
              <Card style={styles.slotCard}>
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
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => Alert.alert('Cancel this date?', 'Users who already joined will keep their spot recorded, but no one else can join.', [
                    { text: 'Keep', style: 'cancel' },
                    { text: 'Cancel Date', style: 'destructive', onPress: () => cancelMutation.mutate(slot.id) },
                  ])}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </Card>
            </Animated.View>
          ))
        )}
      </ScrollView>

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
  listTitle: { ...typography.h1, fontSize: 18, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  slotCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slotDateBadge: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  slotDateDay: { fontWeight: '800', fontSize: 15, lineHeight: 18 },
  slotDateMonth: { fontWeight: '600', fontSize: 10, textTransform: 'uppercase' },
  slotTime: { fontWeight: '700', color: colors.text },
  slotSpots: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cancelBtn: { padding: 4 },
});
