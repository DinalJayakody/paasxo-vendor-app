import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useRoleTheme } from '@/hooks/useRoleTheme';
import { TrainerApi } from '@/api/trainer';
import { TrainerCategory, TrainerProfile, UpsertTrainerProfilePayload } from '@/types';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import GradientBackground from '@/components/GradientBackground';
import AvatarPicker from '@/components/AvatarPicker';
import CoverImagePicker from '@/components/CoverImagePicker';
import SelectChip from '@/components/SelectChip';
import ScreenGlow from '@/components/ScreenGlow';
import SpecialitiesEditor from '@/components/SpecialitiesEditor';
import MediaGalleryEditor from '@/components/MediaGalleryEditor';

const TRAINER_SPECIALITY_IDEAS = [
  'Weight loss', 'Strength & conditioning', 'Muscle gain', 'Mobility & flexibility', 'Injury rehab',
  'Beginners welcome', 'Women-only classes', 'Kids & teens', 'Sports performance', 'Nutrition coaching',
];

const CATEGORY_OPTIONS: { label: string; value: TrainerCategory }[] = [
  { label: 'Gym', value: 'GYM' },
  { label: 'Bodybuilding', value: 'BODYBUILDING' },
  { label: 'Calisthenics', value: 'CALISTHENICS' },
  { label: 'Zumba', value: 'ZUMBA' },
  { label: 'Dancing', value: 'DANCING' },
  { label: 'Yoga', value: 'YOGA' },
  { label: 'CrossFit', value: 'CROSSFIT' },
  { label: 'Martial Arts', value: 'MARTIAL_ARTS' },
  { label: 'Pilates', value: 'PILATES' },
  { label: 'Other', value: 'OTHER' },
];

export default function EditTrainerProfileScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const palette = useRoleTheme();
  const { width: screenW } = useWindowDimensions();
  const applyProfile = (p: TrainerProfile) => {
    queryClient.setQueryData(['trainer-profile', 'mine'], p);
    queryClient.invalidateQueries({ queryKey: ['trainer-profile'], predicate: (q) => q.queryKey[1] !== 'mine' });
  };

  const { data: existing, isLoading, isFetched } = useQuery({
    queryKey: ['trainer-profile', 'mine'], queryFn: TrainerApi.getMyProfile, retry: false,
  });

  const [categories, setCategories] = useState<TrainerCategory[]>([]);
  const [bio, setBio] = useState('');
  const [certifications, setCertifications] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [location, setLocation] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | undefined>(undefined);
  const [coverImageUri, setCoverImageUri] = useState<string | undefined>(undefined);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (!isFetched || prefilled) return;
    if (existing) {
      setCategories(existing.categories ?? []);
      setBio(existing.bio ?? '');
      setCertifications(existing.certifications ?? '');
      setExperienceYears(existing.experienceYears != null ? String(existing.experienceYears) : '');
      setHourlyRate(existing.hourlyRate != null ? String(existing.hourlyRate) : '');
      setLocation(existing.location ?? '');
      if (existing.profileImageUrl) setProfileImageUri(existing.profileImageUrl);
      if (existing.coverImageUrl) setCoverImageUri(existing.coverImageUrl);
    }
    setPrefilled(true);
  }, [existing, isFetched, prefilled]);

  const toggleCategory = (c: TrainerCategory) => {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const mutation = useMutation({
    mutationFn: (payload: UpsertTrainerProfilePayload) => {
      const newProfileUri = profileImageUri && !profileImageUri.startsWith('http') ? profileImageUri : undefined;
      const newCoverUri = coverImageUri && !coverImageUri.startsWith('http') ? coverImageUri : undefined;
      return TrainerApi.upsertMyProfile(payload, newProfileUri, newCoverUri);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-profile'] });
      Alert.alert('Profile saved', 'Your trainer profile is live.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    },
    onError: (e: any) => Alert.alert(
      'Could not save profile',
      e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please try again',
    ),
  });

  const handleSubmit = () => {
    if (categories.length === 0) {
      Alert.alert('Pick at least one specialty', 'Choose the training categories you offer.');
      return;
    }
    if (!bio.trim()) {
      Alert.alert('Add a bio', 'Tell users a bit about your coaching background.');
      return;
    }
    mutation.mutate({
      categories,
      bio: bio.trim(),
      certifications: certifications.trim() || undefined,
      experienceYears: experienceYears ? parseInt(experienceYears, 10) : undefined,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      location: location.trim() || undefined,
    });
  };

  if (isLoading) {
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
        <GradientBackground colors={[palette.heroStart, palette.heroMid, palette.heroEnd]} />
        <View style={styles.heroTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.heroTitle}>Trainer Profile</Text>
        <Text style={styles.heroSubtitle}>Tell users about your coaching</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={styles.label}>Cover Photo</Text>
            <CoverImagePicker uri={coverImageUri} onChange={setCoverImageUri} label="Add a cover photo" />

            <View style={styles.avatarRow}>
              <AvatarPicker uri={profileImageUri} onChange={setProfileImageUri} size={76} />
              <Text style={styles.avatarHint}>Profile photo</Text>
            </View>

            <Text style={styles.label}>Training types</Text>
            <View style={styles.chipRow}>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectChip key={c.value} label={c.label} selected={categories.includes(c.value)} onPress={() => toggleCategory(c.value)} />
              ))}
            </View>

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Share your coaching philosophy and experience"
              placeholderTextColor={colors.textMuted}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Certifications</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. NASM-CPT, ACE Certified"
              placeholderTextColor={colors.textMuted}
              value={certifications}
              onChangeText={setCertifications}
            />

            <View style={styles.rowGap}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Experience (yrs)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Hourly Rate (LKR)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="3000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                />
              </View>
            </View>

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Colombo"
              placeholderTextColor={colors.textMuted}
              value={location}
              onChangeText={setLocation}
            />

            <PrimaryButton
              title="Save Profile"
              onPress={handleSubmit}
              loading={mutation.isPending}
              style={{ marginTop: spacing.lg, backgroundColor: palette.accent, shadowColor: palette.accent }}
            />
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Specialities</Text>
            <Text style={styles.cardSub}>What you're best at — shown on your profile and used in search.</Text>
            {existing ? (
              <View style={{ marginTop: spacing.md }}>
                <SpecialitiesEditor
                  value={existing.specialities ?? []}
                  suggestions={TRAINER_SPECIALITY_IDEAS}
                  placeholder="e.g. Strength & conditioning"
                  onSave={async (next) => applyProfile(await TrainerApi.setMySpecialities(next))}
                />
              </View>
            ) : (
              <Text style={styles.lockedNote}>Save your profile first, then add specialities here.</Text>
            )}
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Training Photos & Videos</Text>
            <Text style={styles.cardSub}>Let clients see your sessions, space and results.</Text>
            {existing ? (
              <View style={{ marginTop: spacing.md }}>
                <MediaGalleryEditor
                  items={existing.media ?? []}
                  width={screenW - spacing.md * 4}
                  onAdd={async (m) => applyProfile(await TrainerApi.addMyMedia(m))}
                  onRemove={async (url) => applyProfile(await TrainerApi.removeMyMedia(url))}
                />
              </View>
            ) : (
              <Text style={styles.lockedNote}>Save your profile first, then add photos and videos here.</Text>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingCenter: { alignItems: 'center', justifyContent: 'center' },
  hero: { height: 150, overflow: 'hidden', justifyContent: 'flex-end', padding: spacing.md },
  heroTop: { position: 'absolute', top: spacing.md, left: spacing.md },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { ...typography.h1, fontSize: 24, color: colors.white },
  heroSubtitle: { ...typography.body, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  avatarRow: { alignItems: 'center', marginTop: -spacing.xl, marginBottom: spacing.sm },
  avatarHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  label: { ...typography.label, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  input: {
    backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  rowGap: { flexDirection: 'row', gap: spacing.sm },
  cardTitle: { ...typography.h3, color: colors.text },
  cardSub: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  lockedNote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md, fontStyle: 'italic' },
});
