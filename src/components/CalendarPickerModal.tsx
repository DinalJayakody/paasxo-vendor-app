import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props {
  visible: boolean;
  selectedDate: string; // "YYYY-MM-DD"
  markedDates?: Set<string>;
  minDate?: string; // "YYYY-MM-DD" — dates before this are disabled
  onClose: () => void;
  onSelect: (date: string) => void;
}

function toIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Lightweight, dependency-free month-grid calendar for picking any date (not just a nearby range). */
export default function CalendarPickerModal({ visible, selectedDate, markedDates, minDate, onClose, onSelect }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [viewMonth, setViewMonth] = useState(() => parseIso(selectedDate));

  useEffect(() => {
    if (visible) setViewMonth(parseIso(selectedDate));
  }, [visible, selectedDate]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const todayIso = toIso(new Date());

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta: number) => setViewMonth(new Date(year, month + delta, 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(-1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{MONTH_LABELS[month]} {year}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((w, i) => (
              <Text key={i} style={styles.weekdayLabel}>{w}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day == null) return <View key={idx} style={styles.cell} />;
              const iso = toIso(new Date(year, month, day));
              const isSelected = iso === selectedDate;
              const isToday = iso === todayIso;
              const isDisabled = !!minDate && iso < minDate;
              const isMarked = markedDates?.has(iso);
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.cell}
                  disabled={isDisabled}
                  onPress={() => onSelect(iso)}
                  activeOpacity={0.75}
                >
                  <View style={[
                    styles.dayCircle,
                    isSelected && styles.dayCircleSelected,
                    isToday && !isSelected && styles.dayCircleToday,
                  ]}>
                    <Text style={[
                      styles.dayText,
                      isDisabled && styles.dayTextDisabled,
                      isSelected && styles.dayTextSelected,
                    ]}>
                      {day}
                    </Text>
                    {isMarked && <View style={[styles.markedDot, isSelected && styles.markedDotSelected]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,42,68,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn: {
    width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.h3, color: colors.text },
  weekdayRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekdayLabel: { flex: 1, textAlign: 'center', color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: colors.primary },
  dayCircleToday: { borderWidth: 1.5, borderColor: colors.primary },
  dayText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  dayTextDisabled: { color: colors.border },
  dayTextSelected: { color: colors.white, fontWeight: '800' },
  markedDot: { position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.danger },
  markedDotSelected: { backgroundColor: colors.white },
  closeBtn: { alignItems: 'center', marginTop: spacing.md },
  closeBtnText: { color: colors.textMuted, fontWeight: '600' },
});
