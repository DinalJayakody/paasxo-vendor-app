import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useRoleTheme } from '@/hooks/useRoleTheme';
import { TrainerApi } from '@/api/trainer';
import { CreateSessionPayload, DayOfWeekName, TrainerCategory } from '@/types';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import GradientBackground from '@/components/GradientBackground';
import CoverImagePicker from '@/components/CoverImagePicker';
import SelectChip from '@/components/SelectChip';
import ScreenGlow from '@/components/ScreenGlow';

const CATEGORIES: { key: TrainerCategory; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'GYM', icon: 'barbell-outline', color: '#EA580C' },
  { key: 'CALISTHENICS', icon: 'body-outline', color: '#059669' },
  { key: 'DANCING', icon: 'musical-notes-outline', color: '#7C3AED' },
  { key: 'YOGA', icon: 'leaf-outline', color: '#0EA5E9' },
  { key: 'CROSSFIT', icon: 'flame-outline', color: '#DC2626' },
  { key: 'MARTIAL_ARTS', icon: 'fitness-outline', color: '#B45309' },
  { key: 'BODYBUILDING', icon: 'barbell', color: '#475569' },
  { key: 'ZUMBA', icon: 'musical-note-outline', color: '#DB2777' },
];

const DAYS: { key: DayOfWeekName; label: string }[] = [
  { key: 'MONDAY', label: 'Mon' }, { key: 'TUESDAY', label: 'Tue' }, { key: 'WEDNESDAY', label: 'Wed' },
  { key: 'THURSDAY', label: 'Thu' }, { key: 'FRIDAY', label: 'Fri' }, { key: 'SATURDAY', label: 'Sat' }, { key: 'SUNDAY', label: 'Sun' },
];

function defaultTime(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimeForApi(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function parseTimeFromApi(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export default function CreateSessionScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const palette = useRoleTheme();
  const sessionId: number | undefined = route?.params?.sessionId;
  const isEditing = !!sessionId;

  const [category, setCategory] = useState<TrainerCategory | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [capacity, setCapacity] = useState('10');
  const [days, setDays] = useState<DayOfWeekName[]>([]);
  const [startTime, setStartTime] = useState(defaultTime(6));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState('');
  const [planDetails, setPlanDetails] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [prefilled, setPrefilled] = useState(!isEditing);

  const { data: existing, isLoading: loadingSession } = useQuery({
    queryKey: ['trainer-session', sessionId],
    queryFn: () => TrainerApi.getSessionById(sessionId!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (!existing || prefilled) return;
    setCategory(existing.category);
    setTitle(existing.title);
    setDescription(existing.description ?? '');
    setPrice(String(existing.price));
    setDurationMinutes(String(existing.durationMinutes));
    setCapacity(String(existing.capacity));
    setDays(existing.daysOfWeek);
    setStartTime(parseTimeFromApi(existing.startTime));
    setIsOnline(existing.isOnline);
    setLocation(existing.location ?? '');
    setPlanDetails(existing.planDetails ?? '');
    if (existing.imageUrl) setImageUri(existing.imageUrl);
    setPrefilled(true);
  }, [existing, prefilled]);

  const toggleDay = (d: DayOfWeekName) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const mutation = useMutation({
    mutationFn: (payload: CreateSessionPayload) => {
      const newImageUri = imageUri && !imageUri.startsWith('http') ? imageUri : undefined;
      return isEditing ? TrainerApi.updateSession(sessionId!, payload, newImageUri) : TrainerApi.createSession(payload, newImageUri);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-sessions'] });
      if (isEditing) queryClient.invalidateQueries({ queryKey: ['trainer-session', sessionId] });
      Alert.alert(
        isEditing ? 'Session updated' : 'Session created',
        isEditing ? `${title} has been updated.` : `${title} is live — generate its availability next.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    },
    onError: (e: any) => Alert.alert(
      isEditing ? 'Could not update session' : 'Could not create session',
      e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please try again',
    ),
  });

  const handleSubmit = () => {
    if (!category) {
      Alert.alert('Pick a category', 'Choose what kind of session this is.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your session a name.');
      return;
    }
    const priceNum = parseFloat(price);
    if (!price || Number.isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Invalid price', 'Enter a valid price per session.');
      return;
    }
    const durationNum = parseInt(durationMinutes, 10);
    if (!durationMinutes || Number.isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Invalid duration', 'Enter a valid session duration in minutes.');
      return;
    }
    const capacityNum = parseInt(capacity, 10);
    if (!capacity || Number.isNaN(capacityNum) || capacityNum <= 0) {
      Alert.alert('Invalid capacity', 'Enter how many people can join a session.');
      return;
    }
    if (days.length === 0) {
      Alert.alert('Pick your schedule', 'Choose at least one day of the week.');
      return;
    }
    if (!isOnline && !location.trim()) {
      Alert.alert('Location required', 'Add a location, or mark this session as online.');
      return;
    }

    mutation.mutate({
      title: title.trim(),
      category,
      description: description.trim() || undefined,
      location: isOnline ? undefined : location.trim(),
      isOnline,
      price: priceNum,
      durationMinutes: durationNum,
      capacity: capacityNum,
      daysOfWeek: days,
      startTime: formatTimeForApi(startTime),
      planDetails: planDetails.trim() || undefined,
    });
  };

  const activeCategory = CATEGORIES.find((c) => c.key === category);

  if (isEditing && loadingSession) {
    return (
      <SafeAreaView style={[styles.safe, styles.loadingCenter]}>
        <ActivityIndicator color={palette.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenGlow />
      <View style={styles.hero}>
        <GradientBackground colors={activeCategory ? [palette.heroStart, activeCategory.color] : [palette.heroStart, palette.heroMid, palette.heroEnd]} />
        <View style={styles.heroTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.heroTitle}>{isEditing ? 'Edit Session' : 'Create Session'}</Text>
        <Text style={styles.heroSubtitle}>{isEditing ? 'Update your session details' : 'Set up a new training session'}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((c) => {
              const selected = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.categoryCard, selected && { backgroundColor: c.color, borderColor: c.color }]}
                  onPress={() => setCategory(c.key)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={c.icon} size={20} color={selected ? colors.white : c.color} />
                  <Text style={[styles.categoryLabel, selected && { color: colors.white }]}>{c.key.replace('_', ' ')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Card>
            <Text style={styles.label}>Session Photo</Text>
            <CoverImagePicker uri={imageUri} onChange={setImageUri} />

            <Text style={styles.label}>Session Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Morning Calisthenics Bootcamp"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What should members expect from this session?"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.rowGap}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Price (LKR)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1500"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Duration (min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="60"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Capacity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  value={capacity}
                  onChangeText={setCapacity}
                />
              </View>
            </View>

            <Text style={styles.label}>Repeats Weekly On</Text>
            <View style={styles.chipRow}>
              {DAYS.map((d) => (
                <SelectChip key={d.key} label={d.label} selected={days.includes(d.key)} onPress={() => toggleDay(d.key)} />
              ))}
            </View>

            <Text style={styles.label}>Start Time</Text>
            <TouchableOpacity style={styles.timeField} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={16} color={palette.accent} />
              <Text style={styles.timeText}>{formatTimeLabel(startTime)}</Text>
            </TouchableOpacity>

            <View style={styles.onlineRow}>
              <View>
                <Text style={styles.label}>Online Session</Text>
                <Text style={styles.onlineHint}>No physical location needed</Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={setIsOnline}
                trackColor={{ true: palette.accent, false: colors.border }}
                thumbColor={colors.white}
              />
            </View>

            {!isOnline && (
              <>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Viharamahadevi Park, Colombo"
                  placeholderTextColor={colors.textMuted}
                  value={location}
                  onChangeText={setLocation}
                />
              </>
            )}

            <Text style={styles.label}>Diet Plan / Workout Schedule / Comments</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Shared with everyone who joins this session — e.g. bring water, warm-up routine, meal tips"
              placeholderTextColor={colors.textMuted}
              value={planDetails}
              onChangeText={setPlanDetails}
              multiline
              numberOfLines={3}
            />

            <PrimaryButton
              title={isEditing ? 'Save Changes' : 'Create Session'}
              onPress={handleSubmit}
              loading={mutation.isPending}
              style={{ marginTop: spacing.lg, backgroundColor: palette.accent, shadowColor: palette.accent }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {showTimePicker && Platform.OS === 'ios' && (
        <View style={[styles.iosPickerSheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.iosPickerHeader}>
            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
              <Text style={[styles.iosPickerDone, { color: palette.accent }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={startTime}
            mode="time"
            display="spinner"
            onChange={(_e: DateTimePickerEvent, selected?: Date) => selected && setStartTime(selected)}
          />
        </View>
      )}
      {showTimePicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={startTime}
          mode="time"
          display="default"
          onChange={(event: DateTimePickerEvent, selected?: Date) => {
            setShowTimePicker(false);
            if (event.type !== 'dismissed' && selected) setStartTime(selected);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingCenter: { alignItems: 'center', justifyContent: 'center' },
  hero: { height: 180, overflow: 'hidden', justifyContent: 'flex-end', padding: spacing.md },
  heroTop: { position: 'absolute', top: spacing.md, left: spacing.md },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { ...typography.h1, fontSize: 26, color: colors.white },
  heroSubtitle: { ...typography.body, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionLabel: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  categoryCard: {
    flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  categoryLabel: { fontSize: 10.5, fontWeight: '700', color: colors.text, textAlign: 'center' },
  label: { ...typography.label, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  rowGap: { flexDirection: 'row', gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  timeField: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.background,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 12, alignSelf: 'flex-start',
  },
  timeText: { color: colors.text, fontWeight: '600' },
  onlineRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md,
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  onlineHint: { ...typography.caption, color: colors.textMuted },
  iosPickerSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    shadowColor: colors.black, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  iosPickerHeader: {
    flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  iosPickerDone: { fontWeight: '700', fontSize: 15, padding: spacing.xs },
});
