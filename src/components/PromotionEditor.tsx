import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { Promotion } from '@/types';
import CalendarPickerModal from '@/components/CalendarPickerModal';

const QUICK = [10, 15, 20, 25, 30, 50];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function prettyDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  value?: Promotion | null;
  /** Regular price, to preview the discounted one. */
  basePrice?: number | null;
  priceSuffix?: string;
  accent?: string;
  onSave: (promo: Promotion) => Promise<void>;
  onClear: () => Promise<void>;
}

/**
 * Marketing discount editor (sheet V6 / T9): a percentage off, optionally
 * only between two dates, with a short label players see. The server applies
 * it to the price — this only edits the settings.
 */
export default function PromotionEditor({ value, basePrice, priceSuffix = '', accent, onSave, onClear }: Props) {
  const { colors } = useTheme();
  const tint = accent ?? colors.primary;
  const s = useMemo(() => createStyles(colors, tint), [colors, tint]);

  const [editing, setEditing] = useState(false);
  const [percent, setPercent] = useState('');
  const [label, setLabel] = useState('');
  const [startsOn, setStartsOn] = useState<string | null>(null);
  const [endsOn, setEndsOn] = useState<string | null>(null);
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setPercent(value?.discountPercent ? String(value.discountPercent) : '');
    setLabel(value?.label ?? '');
    setStartsOn(value?.startsOn ?? null);
    setEndsOn(value?.endsOn ?? null);
  };
  useEffect(reset, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = parseInt(percent, 10);
  const pctValid = Number.isFinite(pct) && pct >= 1 && pct <= 90;
  const preview = basePrice != null && pctValid ? Math.round(basePrice * (100 - pct)) / 100 : null;
  const errMsg = (e: any) => e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please try again.';

  const save = async () => {
    if (!pctValid) { Alert.alert('Check the discount', 'Enter a discount between 1% and 90%.'); return; }
    if (startsOn && endsOn && endsOn < startsOn) { Alert.alert('Check the dates', 'The end date must be on or after the start date.'); return; }
    setBusy(true);
    try {
      await onSave({ discountPercent: pct, startsOn, endsOn, label: label.trim() || null });
      setEditing(false);
    } catch (e) {
      Alert.alert('Could not save discount', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const clear = () => Alert.alert('End this discount?', 'Prices go back to normal for new bookings straight away.', [
    { text: 'Keep it', style: 'cancel' },
    {
      text: 'End discount', style: 'destructive', onPress: async () => {
        setBusy(true);
        try { await onClear(); setEditing(false); } catch (e) { Alert.alert('Could not end discount', errMsg(e)); } finally { setBusy(false); }
      },
    },
  ]);

  if (!editing && value) {
    const window = value.startsOn || value.endsOn
      ? `${value.startsOn ? prettyDate(value.startsOn) : 'Now'} – ${value.endsOn ? prettyDate(value.endsOn) : 'until you end it'}`
      : 'Running until you end it';
    return (
      <View>
        <View style={s.activeCard}>
          <View style={s.badge}><Text style={s.badgeText}>{value.discountPercent}% OFF</Text></View>
          <View style={{ flex: 1 }}>
            {!!value.label && <Text style={s.activeLabel} numberOfLines={1}>{value.label}</Text>}
            <Text style={s.activeWindow}>{window}</Text>
            <Text style={[s.activeStatus, { color: value.activeToday ? colors.success : colors.warning }]}>
              {value.activeToday ? 'Live today' : 'Scheduled'}
            </Text>
          </View>
        </View>
        <View style={s.row}>
          <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={() => { reset(); setEditing(true); }} disabled={busy}>
            <Text style={[s.btnGhostText]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnDanger]} onPress={clear} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.danger} /> : <Text style={s.btnDangerText}>End discount</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!editing) {
    return (
      <TouchableOpacity style={s.startBtn} onPress={() => { reset(); setEditing(true); }} accessibilityRole="button">
        <Ionicons name="pricetag-outline" size={18} color={tint} />
        <Text style={s.startText}>Run a discount</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <Text style={s.label}>Discount</Text>
      <View style={s.quickRow}>
        {QUICK.map((q) => (
          <TouchableOpacity key={q} style={[s.quick, pct === q && s.quickOn]} onPress={() => setPercent(String(q))}>
            <Text style={[s.quickText, pct === q && s.quickTextOn]}>{q}%</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.pctRow}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={percent}
          onChangeText={(t) => setPercent(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          placeholder="Custom %"
          placeholderTextColor={colors.textMuted}
        />
        {preview != null && (
          <Text style={s.preview}>
            <Text style={s.strike}>LKR {basePrice!.toLocaleString()}</Text>{'  '}LKR {preview.toLocaleString()}{priceSuffix}
          </Text>
        )}
      </View>

      <Text style={s.label}>Label (optional)</Text>
      <TextInput
        style={s.input}
        value={label}
        onChangeText={setLabel}
        maxLength={40}
        placeholder="e.g. Weekday special"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={s.label}>When</Text>
      <View style={s.row}>
        <TouchableOpacity style={s.dateField} onPress={() => setPicker('start')}>
          <Ionicons name="calendar-outline" size={15} color={tint} />
          <Text style={s.dateText}>{startsOn ? prettyDate(startsOn) : 'Starts now'}</Text>
          {!!startsOn && <Ionicons name="close-circle" size={16} color={colors.textMuted} onPress={() => setStartsOn(null)} />}
        </TouchableOpacity>
        <TouchableOpacity style={s.dateField} onPress={() => setPicker('end')}>
          <Ionicons name="flag-outline" size={15} color={tint} />
          <Text style={s.dateText}>{endsOn ? prettyDate(endsOn) : 'No end date'}</Text>
          {!!endsOn && <Ionicons name="close-circle" size={16} color={colors.textMuted} onPress={() => setEndsOn(null)} />}
        </TouchableOpacity>
      </View>
      <Text style={s.hint}>Applies to bookings for dates in this range.</Text>

      <View style={s.row}>
        <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={() => setEditing(false)} disabled={busy}>
          <Text style={s.btnGhostText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, { backgroundColor: tint }, !pctValid && { opacity: 0.5 }]} onPress={save} disabled={busy || !pctValid}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnText}>{value ? 'Update discount' : 'Start discount'}</Text>}
        </TouchableOpacity>
      </View>

      <CalendarPickerModal
        visible={picker !== null}
        selectedDate={(picker === 'start' ? startsOn : endsOn) ?? startsOn ?? todayIso()}
        minDate={picker === 'end' ? (startsOn ?? todayIso()) : todayIso()}
        onClose={() => setPicker(null)}
        onSelect={(d) => {
          if (picker === 'start') { setStartsOn(d); if (endsOn && endsOn < d) setEndsOn(d); }
          else setEndsOn(d);
          setPicker(null);
        }}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors, tint: string) => StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quick: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border },
  quickOn: { backgroundColor: tint, borderColor: tint },
  quickText: { fontWeight: '700', color: colors.text },
  quickTextOn: { color: colors.white },
  pctRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  input: {
    height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    paddingHorizontal: 12, fontSize: 14, color: colors.text,
  },
  preview: { fontSize: 14, fontWeight: '800', color: colors.success },
  strike: { textDecorationLine: 'line-through', color: colors.textMuted, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  dateField: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  dateText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  btn: { flex: 1, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 14.5 },
  btnGhost: { backgroundColor: colors.primarySoft },
  btnGhostText: { color: colors.text, fontWeight: '700', fontSize: 14.5 },
  btnDanger: { backgroundColor: colors.dangerLight },
  btnDangerText: { color: colors.danger, fontWeight: '700', fontSize: 14.5 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: radius.md,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: tint,
  },
  startText: { color: tint, fontWeight: '700', fontSize: 14.5 },
  activeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.successLight,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.success },
  badgeText: { color: colors.white, fontWeight: '900', fontSize: 14 },
  activeLabel: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  activeWindow: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  activeStatus: { fontSize: 12, fontWeight: '800', marginTop: 2 },
});
