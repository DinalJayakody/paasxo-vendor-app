import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

const MAX_ITEMS = 15;
const MAX_LEN = 40;

interface Props {
  value: string[];
  /** Quick-add ideas shown under the input (ones already added are hidden). */
  suggestions?: string[];
  placeholder?: string;
  onSave: (next: string[]) => Promise<void>;
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ');

/**
 * Edits a list of short "speciality" tags (sheet V4 / T7) — e.g. a venue's
 * "Floodlit turf", a trainer's "Strength & conditioning". Changes are local
 * until Save, which sends the full list (the backend trims, de-dupes and caps).
 */
export default function SpecialitiesEditor({ value, suggestions = [], placeholder, onSave }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<string[]>(value);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setItems(value); }, [value]);

  const dirty = items.length !== value.length || items.some((v, i) => v !== value[i]);
  const has = (s: string) => items.some((x) => x.toLowerCase() === s.toLowerCase());

  const add = (raw: string) => {
    const s = norm(raw).slice(0, MAX_LEN);
    if (!s) return;
    if (has(s)) { setDraft(''); return; }
    if (items.length >= MAX_ITEMS) {
      Alert.alert('Limit reached', `You can list up to ${MAX_ITEMS} specialities.`);
      return;
    }
    setItems((prev) => [...prev, s]);
    setDraft('');
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(items);
    } catch (e: any) {
      Alert.alert('Could not save', e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const freeSuggestions = suggestions.filter((s) => !has(s)).slice(0, 8);

  return (
    <View>
      {items.length > 0 ? (
        <View style={styles.wrap}>
          {items.map((s) => (
            <View key={s} style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>{s}</Text>
              <TouchableOpacity
                onPress={() => setItems((prev) => prev.filter((x) => x !== s))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${s}`}
              >
                <Ionicons name="close" size={14} color={colors.primaryDark} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Nothing listed yet. Add what you're known for.</Text>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder ?? 'Add a speciality'}
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_LEN}
          returnKeyType="done"
          onSubmitEditing={() => add(draft)}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.addBtn, !norm(draft) && { opacity: 0.4 }]}
          onPress={() => add(draft)}
          disabled={!norm(draft)}
          accessibilityRole="button"
          accessibilityLabel="Add speciality"
        >
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {freeSuggestions.length > 0 && (
        <View style={[styles.wrap, { marginTop: spacing.sm }]}>
          {freeSuggestions.map((s) => (
            <TouchableOpacity key={s} style={styles.suggestion} onPress={() => add(s)} accessibilityRole="button">
              <Ionicons name="add" size={13} color={colors.textMuted} />
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {dirty && (
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} accessibilityRole="button">
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Save specialities</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%',
    paddingLeft: 12, paddingRight: 10, paddingVertical: 7, borderRadius: radius.pill,
    backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border,
  },
  tagText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark, flexShrink: 1 },
  empty: { fontSize: 13, color: colors.textMuted },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  input: {
    flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: 12, fontSize: 14, color: colors.text,
  },
  addBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill,
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
  },
  suggestionText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  saveBtn: {
    marginTop: spacing.md, height: 46, borderRadius: radius.md, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  saveText: { color: colors.white, fontWeight: '700', fontSize: 14.5 },
});
