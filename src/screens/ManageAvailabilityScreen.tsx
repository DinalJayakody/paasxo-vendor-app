import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '@/theme';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/EmptyState';
import CalendarPickerModal from '@/components/CalendarPickerModal';
import { FutsalApi } from '@/api/futsal';
import { BookingApi } from '@/api/booking';
import { ClosedDateItem, SlotStatus, TimeSlot } from '@/types';

/** Legacy slots created before the backend tracked per-slot status can arrive with
 *  status missing — the backend now self-heals this on read, but only once the
 *  server has been restarted with that fix. Derive a safe status here too so the
 *  screen works immediately regardless of which backend build is currently live. */
function effectiveStatus(slot: TimeSlot): SlotStatus {
  return slot.status ?? (slot.available ? 'AVAILABLE' : 'BLOCKED');
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAY_LABELS[date.getDay()]}, ${d} ${MONTH_LABELS[m - 1]} ${y}`;
}

function errorMessage(e: any, fallback: string) {
  return e?.response?.data?.message ?? fallback;
}

/** Manage Availability: full calendar date picker, real slot status from GET /futsals/{id}/slots,
 *  and direct tap-to-select booking of multiple available slots in one submit. */
export default function ManageAvailabilityScreen({ route }: any) {
  const { venueId } = route.params;
  const today = toIso(new Date());
  const [date, setDate] = useState(today);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionSlot, setActionSlot] = useState<TimeSlot | null>(null);
  const [blockReasonMode, setBlockReasonMode] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [rejectReasonMode, setRejectReasonMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [bulkModal, setBulkModal] = useState<'book' | 'block' | null>(null);
  const [bulkText, setBulkText] = useState('');
  const queryClient = useQueryClient();

  const { data: slots, isLoading } = useQuery({
    queryKey: ['availability', venueId, date],
    queryFn: () => FutsalApi.slotsForDate(venueId, date),
  });
  const { data: closedDates } = useQuery({
    queryKey: ['closed-dates', venueId],
    queryFn: () => FutsalApi.getClosedDates(venueId),
  });

  const closedDateSet = new Set<string>((closedDates ?? []).map((c: ClosedDateItem) => c.date));
  const closedToday = (closedDates ?? []).find((c: ClosedDateItem) => c.date === date);

  const invalidateAvailability = () => queryClient.invalidateQueries({ queryKey: ['availability', venueId, date] });
  const invalidateAll = () => {
    invalidateAvailability();
    queryClient.invalidateQueries({ queryKey: ['closed-dates', venueId] });
    queryClient.invalidateQueries({ queryKey: ['vendor-dashboard', 'bookings'] });
  };

  const clearSelection = () => setSelectedIds([]);
  const closeBulkModal = () => { setBulkModal(null); setBulkText(''); };
  const closeActionModal = () => {
    setActionSlot(null);
    setBlockReasonMode(false); setBlockReason('');
    setRejectReasonMode(false); setRejectReason('');
  };

  const selectDate = (iso: string) => {
    setDate(iso);
    setCalendarVisible(false);
    clearSelection();
  };

  const closeDateMutation = useMutation({
    mutationFn: () => FutsalApi.closeDate(venueId, date, 'Closed by vendor'),
    onSuccess: invalidateAll,
    onError: (e) => Alert.alert('Could not close date', errorMessage(e, 'Please try again')),
  });

  const openDateMutation = useMutation({
    mutationFn: () => FutsalApi.openDate(venueId, date),
    onSuccess: invalidateAll,
    onError: (e) => Alert.alert('Could not reopen date', errorMessage(e, 'Please try again')),
  });

  const generateMutation = useMutation({
    mutationFn: () => FutsalApi.generateSlots(venueId, date),
    onSuccess: invalidateAvailability,
    onError: (e) => Alert.alert('Could not generate slots', errorMessage(e, 'Please try again')),
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ slotId, status, reason }: { slotId: number; status: 'AVAILABLE' | 'BLOCKED'; reason?: string }) =>
      FutsalApi.setSlotStatus(venueId, slotId, status, reason),
    onSuccess: () => { invalidateAll(); closeActionModal(); },
    onError: (e) => Alert.alert('Could not update slot', errorMessage(e, 'Please try again')),
  });

  const blockBulkMutation = useMutation({
    mutationFn: (reason: string) => FutsalApi.blockSlots(venueId, selectedIds, reason || undefined),
    onSuccess: (result) => {
      invalidateAll();
      clearSelection();
      closeBulkModal();
      if (result.skippedCount > 0) {
        Alert.alert('Some slots skipped', `${result.blockedCount} blocked, ${result.skippedCount} already booked and left untouched.`);
      }
    },
    onError: (e) => Alert.alert('Could not block slots', errorMessage(e, 'Please try again')),
  });

  // The core requirement: select multiple AVAILABLE slots, submit once, they all
  // become BOOKED via a single real booking (POST /bookings/vendor -> BookingController).
  const vendorBookMutation = useMutation({
    mutationFn: ({ slotIds, title }: { slotIds: number[]; title?: string }) =>
      BookingApi.vendorBook({ futsalId: venueId, slotIds, title: title || 'Walk-in booking' }),
    onSuccess: () => { invalidateAll(); clearSelection(); closeBulkModal(); },
    onError: (e) => Alert.alert('Could not book slots', errorMessage(e, 'One of those slots may have just been taken — please refresh.')),
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: number) => BookingApi.cancelAsVendor(bookingId),
    onSuccess: () => { invalidateAll(); closeActionModal(); },
    onError: (e) => Alert.alert('Could not cancel booking', errorMessage(e, 'Please try again')),
  });

  const acceptBookingMutation = useMutation({
    mutationFn: (bookingId: number) => BookingApi.acceptBooking(bookingId),
    onSuccess: () => { invalidateAll(); closeActionModal(); },
    onError: (e) => Alert.alert('Could not accept request', errorMessage(e, 'Please try again')),
  });

  const rejectBookingMutation = useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: number; reason?: string }) =>
      BookingApi.rejectBooking(bookingId, reason),
    onSuccess: () => { invalidateAll(); closeActionModal(); },
    onError: (e) => Alert.alert('Could not reject request', errorMessage(e, 'Please try again')),
  });

  const onSlotPress = (slot: TimeSlot) => {
    if (effectiveStatus(slot) === 'AVAILABLE') {
      setSelectedIds((prev) => (prev.includes(slot.id) ? prev.filter((id) => id !== slot.id) : [...prev, slot.id]));
      return;
    }
    setActionSlot(slot);
  };

  const morning = slots?.filter((s: TimeSlot) => parseInt(s.startTime) < 12) ?? [];
  const afternoon = slots?.filter((s: TimeSlot) => parseInt(s.startTime) >= 12 && parseInt(s.startTime) < 17) ?? [];
  const evening = slots?.filter((s: TimeSlot) => parseInt(s.startTime) >= 17) ?? [];

  const renderGroup = (title: string, group: TimeSlot[], delay: number) => {
    if (!group.length) return null;
    return (
      <Animated.View entering={FadeInUp.duration(400).delay(delay).springify()} style={{ marginTop: spacing.md }}>
        <Text style={styles.groupLabel}>{title}</Text>
        <View style={styles.slotGrid}>
          {group.map((slot) => {
            const status = effectiveStatus(slot);
            const isBooked = status === 'BOOKED';
            const isBlocked = status === 'BLOCKED';
            const isPending = status === 'PENDING_VENDOR';
            const isMuted = isBooked || isBlocked || isPending;
            const isSelected = selectedIds.includes(slot.id);
            return (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.slot,
                  isBooked && styles.slotBooked,
                  isBlocked && styles.slotBlocked,
                  isPending && styles.slotPending,
                  !isMuted && styles.slotAvailable,
                  isSelected && styles.slotSelected,
                ]}
                activeOpacity={0.8}
                onPress={() => onSlotPress(slot)}
              >
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark" size={11} color={colors.white} />
                  </View>
                )}
                <Text style={[styles.slotTime, isMuted && styles.slotTimeMuted, isPending && styles.slotTimePending]}>
                  {slot.startTime.slice(0, 5)}
                </Text>
                <Text style={[styles.slotStatus, isMuted && styles.slotTimeMuted, isPending && styles.slotTimePending]}>
                  {isPending ? 'REQUEST PENDING' : isBooked && slot.walkIn ? 'WALK-IN' : status}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.safe}>
      <ScreenHeader
        title="Manage Availability"
        subtitle={formatDateLabel(date)}
        compact
        rightElement={
          <TouchableOpacity style={styles.calendarBtn} onPress={() => setCalendarVisible(true)}>
            <Ionicons name="calendar-outline" size={16} color={colors.white} />
            <Text style={styles.calendarBtnText}>Change</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Close Venue</Text>
              <Text style={styles.closedSub}>
                {closedToday
                  ? `Full day closed${closedToday.reason ? ` — ${closedToday.reason}` : ''}`
                  : 'Venue is open on this date'}
              </Text>
            </View>
            {closedToday ? (
              <TouchableOpacity
                style={[styles.toggleBtn, styles.toggleBtnOpen]}
                onPress={() => openDateMutation.mutate()}
                disabled={openDateMutation.isPending}
              >
                {openDateMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.success} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                    <Text style={[styles.toggleBtnText, { color: colors.success }]}>Reopen Day</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.toggleBtn, styles.toggleBtnClose]}
                onPress={() => closeDateMutation.mutate()}
                disabled={closeDateMutation.isPending}
              >
                {closeDateMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                    <Text style={[styles.toggleBtnText, { color: colors.danger }]}>Close Full Day</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.hintText}>
            Only need part of the day? Tap the available slots below to select a time range, then Block or Book them.
          </Text>
        </Card>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : (
          <>
            {renderGroup('MORNING SLOTS', morning, 60)}
            {renderGroup('AFTERNOON SLOTS', afternoon, 120)}
            {renderGroup('EVENING SLOTS', evening, 180)}

            {(!slots || slots.length === 0) && (
              <EmptyState
                pose="sit"
                title="No slots generated"
                message="Generate slots for this date to start managing availability."
                ctaLabel="Generate Slots"
                onCta={() => generateMutation.mutate()}
              />
            )}
          </>
        )}

        {selectedIds.length > 0 && <View style={{ height: 90 }} />}
      </ScrollView>

      {selectedIds.length > 0 && (
        <Animated.View entering={FadeInUp.duration(250)} style={styles.selectionBar}>
          <TouchableOpacity onPress={clearSelection} hitSlop={8}>
            <Text style={styles.selectionCount}>{selectedIds.length} selected ✕</Text>
          </TouchableOpacity>
          <View style={styles.selectionActions}>
            <TouchableOpacity style={[styles.selectionBtn, styles.selectionBtnBlock]} onPress={() => setBulkModal('block')}>
              <Ionicons name="ban-outline" size={16} color={colors.danger} />
              <Text style={[styles.selectionBtnText, { color: colors.danger }]}>Block</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.selectionBtn, styles.selectionBtnBook]} onPress={() => setBulkModal('book')}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
              <Text style={[styles.selectionBtnText, { color: colors.white }]}>Book Selected</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Bulk book/block modal for selected slots */}
      <Modal visible={!!bulkModal} transparent animationType="fade" onRequestClose={closeBulkModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {bulkModal === 'book' ? `Book ${selectedIds.length} slot(s)` : `Block ${selectedIds.length} slot(s)`}
            </Text>
            <Text style={styles.modalSubtitle}>
              {bulkModal === 'book'
                ? 'Creates a real booking for a walk-in or phone customer and marks these slots as Booked.'
                : 'These slots will be marked unavailable to customers.'}
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder={bulkModal === 'book' ? 'Customer name (optional)' : 'Reason (optional) — e.g. Maintenance'}
              placeholderTextColor={colors.textMuted}
              value={bulkText}
              onChangeText={setBulkText}
            />
            <PrimaryButton
              title={bulkModal === 'book' ? 'Submit & Mark Booked' : 'Confirm Block'}
              onPress={() => {
                if (bulkModal === 'book') vendorBookMutation.mutate({ slotIds: selectedIds, title: bulkText.trim() });
                else blockBulkMutation.mutate(bulkText.trim());
              }}
              loading={vendorBookMutation.isPending || blockBulkMutation.isPending}
              style={{ marginTop: spacing.sm }}
            />
            <TouchableOpacity style={styles.modalCancel} onPress={closeBulkModal}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Single-slot info/action modal — only reachable for BOOKED/BLOCKED/PENDING_VENDOR slots
          (AVAILABLE slots are selected directly in the grid above). */}
      <Modal visible={!!actionSlot} transparent animationType="fade" onRequestClose={closeActionModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {actionSlot && (() => {
              const status = effectiveStatus(actionSlot);
              return (
              <>
                <Text style={styles.modalTitle}>{actionSlot.startTime.slice(0, 5)}–{actionSlot.endTime.slice(0, 5)}</Text>
                <Text style={styles.modalSubtitle}>
                  {status === 'PENDING_VENDOR'
                    ? 'A customer wants to book this slot — accept or reject the request.'
                    : status === 'BOOKED'
                    ? actionSlot.walkIn ? 'Walk-in booking (added by you)' : 'Booked by a customer'
                    : `Currently ${status}${actionSlot.blockedReason ? ` — ${actionSlot.blockedReason}` : ''}`}
                </Text>

                {status === 'PENDING_VENDOR' ? (
                  rejectReasonMode ? (
                    <>
                      <TextInput
                        style={styles.reasonInput}
                        placeholder="Reason (optional) — e.g. Venue unavailable"
                        placeholderTextColor={colors.textMuted}
                        value={rejectReason}
                        onChangeText={setRejectReason}
                      />
                      <PrimaryButton
                        title="Confirm Reject"
                        onPress={() => {
                          if (!actionSlot.bookingId) {
                            Alert.alert('Unable to locate booking', 'Please pull to refresh and try again.');
                            return;
                          }
                          rejectBookingMutation.mutate({ bookingId: actionSlot.bookingId, reason: rejectReason.trim() || undefined });
                        }}
                        loading={rejectBookingMutation.isPending}
                        style={{ marginTop: spacing.sm, backgroundColor: colors.danger }}
                      />
                      <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectReasonMode(false)}>
                        <Text style={styles.modalCancelText}>Back</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <PrimaryButton
                        title="Accept Request"
                        icon="checkmark-circle-outline"
                        onPress={() => {
                          if (!actionSlot.bookingId) {
                            Alert.alert('Unable to locate booking', 'Please pull to refresh and try again.');
                            return;
                          }
                          acceptBookingMutation.mutate(actionSlot.bookingId);
                        }}
                        loading={acceptBookingMutation.isPending}
                        style={{ backgroundColor: colors.success }}
                      />
                      <PrimaryButton
                        title="Reject Request"
                        icon="close-circle-outline"
                        onPress={() => setRejectReasonMode(true)}
                        variant="outline"
                        style={{ marginTop: spacing.sm, borderColor: colors.danger }}
                      />
                      <TouchableOpacity style={styles.modalCancel} onPress={closeActionModal}>
                        <Text style={styles.modalCancelText}>Close</Text>
                      </TouchableOpacity>
                    </>
                  )
                ) : blockReasonMode ? (
                  <>
                    <TextInput
                      style={styles.reasonInput}
                      placeholder="Reason (optional) — e.g. Maintenance"
                      placeholderTextColor={colors.textMuted}
                      value={blockReason}
                      onChangeText={setBlockReason}
                    />
                    <PrimaryButton
                      title="Confirm Block"
                      onPress={() => setStatusMutation.mutate({ slotId: actionSlot.id, status: 'BLOCKED', reason: blockReason.trim() || undefined })}
                      loading={setStatusMutation.isPending}
                      style={{ marginTop: spacing.sm }}
                    />
                    <TouchableOpacity style={styles.modalCancel} onPress={() => setBlockReasonMode(false)}>
                      <Text style={styles.modalCancelText}>Back</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {status === 'BLOCKED' && (
                      <PrimaryButton
                        title="Reopen Slot"
                        icon="refresh-outline"
                        onPress={() => setStatusMutation.mutate({ slotId: actionSlot.id, status: 'AVAILABLE' })}
                        loading={setStatusMutation.isPending}
                      />
                    )}
                    {status === 'BOOKED' && (
                      <PrimaryButton
                        title="Cancel Booking & Reopen"
                        icon="refresh-outline"
                        onPress={() => {
                          if (!actionSlot.bookingId) {
                            Alert.alert('Unable to locate booking', 'Please pull to refresh and try again.');
                            return;
                          }
                          cancelBookingMutation.mutate(actionSlot.bookingId);
                        }}
                        loading={cancelBookingMutation.isPending}
                      />
                    )}
                    <TouchableOpacity style={styles.modalCancel} onPress={closeActionModal}>
                      <Text style={styles.modalCancelText}>Close</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <CalendarPickerModal
        visible={calendarVisible}
        selectedDate={date}
        markedDates={closedDateSet}
        minDate={today}
        onClose={() => setCalendarVisible(false)}
        onSelect={selectDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typography.h3, color: colors.text },
  closedSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  hintText: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 17 },
  calendarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.pill,
  },
  calendarBtnText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.md, borderWidth: 1.5,
  },
  toggleBtnClose: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  toggleBtnOpen: { borderColor: colors.success, backgroundColor: colors.successLight },
  toggleBtnText: { fontWeight: '700', fontSize: 13 },
  groupLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    width: '47%', borderRadius: radius.md, borderWidth: 1.5, padding: spacing.sm, alignItems: 'center',
  },
  slotAvailable: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  slotBooked: { borderColor: colors.border, backgroundColor: colors.background },
  slotBlocked: { borderColor: colors.dangerLight, backgroundColor: colors.dangerLight },
  slotPending: { borderColor: colors.warning, backgroundColor: colors.warningLight },
  slotTimePending: { color: colors.warning },
  slotSelected: { borderColor: colors.success, backgroundColor: colors.successLight },
  selectedBadge: {
    position: 'absolute', top: -8, right: 8, width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center',
  },
  slotTime: { fontWeight: '700', fontSize: 15, color: colors.primary },
  slotStatus: { fontSize: 11, color: colors.primary, marginTop: 2 },
  slotTimeMuted: { color: colors.textMuted },
  selectionBar: {
    position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md,
    backgroundColor: colors.primaryDark, borderRadius: radius.lg, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: colors.black, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  selectionCount: { color: colors.white, fontWeight: '700' },
  selectionActions: { flexDirection: 'row', gap: spacing.sm },
  selectionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md,
  },
  selectionBtnBlock: { backgroundColor: 'rgba(220,38,38,0.18)' },
  selectionBtnBook: { backgroundColor: colors.success },
  selectionBtnText: { fontWeight: '700', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,42,68,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  modalTitle: { ...typography.h3, color: colors.text },
  modalSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  reasonInput: {
    backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.text, marginBottom: spacing.xs,
  },
  modalCancel: { alignItems: 'center', marginTop: spacing.md },
  modalCancelText: { color: colors.textMuted, fontWeight: '600' },
});
