import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, radius, spacing, typography } from '@/theme';
import { CreateVenuePayload, SportType } from '@/types';
import { FutsalApi } from '@/api/futsal';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import GradientBackground from '@/components/GradientBackground';
import FloatingOrbs from '@/components/FloatingOrbs';
import CoverImagePicker from '@/components/CoverImagePicker';
import LocationPickerModal, { PickedLocation } from '@/components/LocationPickerModal';

const SPORTS: { key: SportType; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'Futsal', icon: 'football-outline', color: '#22C55E' },
  { key: 'Cricket', icon: 'baseball-outline', color: '#F59E0B' },
  { key: 'Pickleball', icon: 'tennisball-outline', color: '#8B5CF6' },
  { key: 'Paddleball', icon: 'disc-outline', color: '#06B6D4' },
];

const SLOT_DURATION_MINUTES = 60;

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

export default function CreateVenueScreen({ navigation, route }: any) {
  const queryClient = useQueryClient();
  const venueId: number | undefined = route?.params?.venueId;
  const isEditing = !!venueId;

  const [sport, setSport] = useState<SportType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerSlot, setPricePerSlot] = useState('');
  const [openTime, setOpenTime] = useState(defaultTime(8));
  const [closeTime, setCloseTime] = useState(defaultTime(22));
  const [activeTimeField, setActiveTimeField] = useState<'open' | 'close' | null>(null);
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [prefilled, setPrefilled] = useState(!isEditing);

  const { data: existingVenue, isLoading: loadingVenue } = useQuery({
    queryKey: ['venue-detail', venueId],
    queryFn: () => FutsalApi.getById(venueId!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (!existingVenue || prefilled) return;
    setName(existingVenue.name);
    setDescription(existingVenue.description ?? '');
    setPricePerSlot(String(existingVenue.pricePerSlot));
    setOpenTime(parseTimeFromApi(existingVenue.openTime));
    setCloseTime(parseTimeFromApi(existingVenue.closeTime));
    if (existingVenue.imageBase64) {
      setImageUri(`data:image/jpeg;base64,${existingVenue.imageBase64}`);
    }
    if (existingVenue.latitude != null && existingVenue.longitude != null) {
      const coords = { latitude: existingVenue.latitude, longitude: existingVenue.longitude };
      Location.reverseGeocodeAsync(coords)
        .then((results) => {
          const place = results[0];
          const city = place?.city || place?.subregion || place?.region || existingVenue.location;
          const formattedAddress = [place?.street, city, place?.region, place?.country].filter(Boolean).join(', ');
          setLocation({ ...coords, city, formattedAddress: formattedAddress || existingVenue.location });
        })
        .catch(() => setLocation({ ...coords, city: existingVenue.location, formattedAddress: existingVenue.location }));
    }
    setPrefilled(true);
  }, [existingVenue, prefilled]);

  const mutation = useMutation({
    mutationFn: (payload: CreateVenuePayload) => {
      if (isEditing) {
        // Only ship a new "image" part when the vendor actually picked a new photo —
        // the prefilled data: URI is for display only, not a re-uploadable file.
        const newImageUri = imageUri && !imageUri.startsWith('data:') ? imageUri : undefined;
        return FutsalApi.update(venueId!, payload, newImageUri);
      }
      return FutsalApi.create(payload, imageUri);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-dashboard'] });
      if (isEditing) queryClient.invalidateQueries({ queryKey: ['venue-detail', venueId] });
      Alert.alert(
        isEditing ? 'Venue updated' : 'Venue created',
        isEditing ? `${name} has been updated.` : `${name} has been added to your account.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    },
    onError: (e: any) => Alert.alert(
      isEditing ? 'Could not update venue' : 'Could not create venue',
      e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please try again',
    ),
  });

  const handleTimeChange = (field: 'open' | 'close') => (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setActiveTimeField(null);
    if (event.type === 'dismissed' || !selected) return;
    if (field === 'open') setOpenTime(selected);
    else setCloseTime(selected);
  };

  const handleSubmit = () => {
    if (!isEditing && !sport) {
      Alert.alert('Select a sport', 'Choose which sport this venue is for.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give your venue a name.');
      return;
    }
    const price = parseFloat(pricePerSlot);
    if (!pricePerSlot || Number.isNaN(price) || price <= 0) {
      Alert.alert('Invalid price', 'Enter a valid price per slot.');
      return;
    }
    if (!location) {
      Alert.alert('Location required', 'Pick your venue’s location on the map.');
      return;
    }
    if (openTime >= closeTime) {
      Alert.alert('Check your hours', 'Closing time must be after opening time.');
      return;
    }

    mutation.mutate({
      name: name.trim(),
      location: location.city,
      description: description.trim() || undefined,
      latitude: location.latitude,
      longitude: location.longitude,
      pricePerSlot: price,
      openTime: formatTimeForApi(openTime),
      closeTime: formatTimeForApi(closeTime),
      slotDurationMinutes: SLOT_DURATION_MINUTES,
      // NOTE: the backend's FutsalRequest has no sport-tagging field yet —
      // every resource created here is stored as a "Futsal" row regardless
      // of which sport card is selected above. Kept as a required UI choice
      // so this keeps working once the backend adds real per-sport support.
    });
  };

  const activeSport = SPORTS.find((s) => s.key === sport);

  if (isEditing && loadingVenue) {
    return (
      <SafeAreaView style={[styles.safe, styles.loadingCenter]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.hero}>
        <GradientBackground
          colors={activeSport ? [colors.heroStart, activeSport.color] : [colors.heroStart, colors.heroMid, colors.heroEnd]}
        />
        <FloatingOrbs height={180} colors={['#FFFFFF', colors.primaryLight, colors.premium]} />
        <View style={styles.heroTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>
          <Image source={require('../../assets/logo.jpeg')} style={styles.heroLogo} />
        </View>
        <Text style={styles.heroTitle}>{isEditing ? 'Edit Venue' : 'Create Venue'}</Text>
        <Text style={styles.heroSubtitle}>
          {isEditing ? 'Update your facility’s details' : 'List a new sports facility on Paasxo'}
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Sport</Text>
          <View style={styles.sportRow}>
            {SPORTS.map((s) => {
              const selected = sport === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.sportCard, selected && { backgroundColor: s.color, borderColor: s.color }]}
                  onPress={() => setSport(s.key)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={s.icon} size={22} color={selected ? colors.white : s.color} />
                  <Text style={[styles.sportLabel, selected && { color: colors.white }]}>{s.key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Card>
            <Text style={styles.label}>Cover Photo</Text>
            <CoverImagePicker uri={imageUri} onChange={setImageUri} />

            <Text style={styles.label}>Venue Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Colombo Futsal Arena"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell players what makes this venue great"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Price per Slot (LKR)</Text>
            <View style={styles.priceInputWrap}>
              <Ionicons name="cash-outline" size={18} color={colors.textMuted} style={{ marginRight: spacing.xs }} />
              <Text style={[styles.slotHint, { marginRight: spacing.xs, fontWeight: '700' }]}>LKR</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={pricePerSlot}
                onChangeText={setPricePerSlot}
              />
              <Text style={styles.slotHint}>/ 60-min slot</Text>
            </View>

            <Text style={styles.label}>Operating Hours</Text>
            <View style={styles.rowGap}>
              <TouchableOpacity style={styles.timeField} onPress={() => setActiveTimeField('open')}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={styles.timeText}>{formatTimeLabel(openTime)}</Text>
              </TouchableOpacity>
              <Text style={styles.toText}>to</Text>
              <TouchableOpacity style={styles.timeField} onPress={() => setActiveTimeField('close')}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={styles.timeText}>{formatTimeLabel(closeTime)}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Location</Text>
            <TouchableOpacity style={styles.locationField} onPress={() => setMapVisible(true)}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationCity}>{location ? location.city : 'Select venue location'}</Text>
                {location && <Text style={styles.locationAddress}>{location.formattedAddress}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <PrimaryButton
              title={isEditing ? 'Save Changes' : 'Create Venue'}
              onPress={handleSubmit}
              loading={mutation.isPending}
              style={{ marginTop: spacing.lg }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {activeTimeField && Platform.OS === 'ios' && (
        <View style={styles.iosPickerSheet}>
          <View style={styles.iosPickerHeader}>
            <TouchableOpacity onPress={() => setActiveTimeField(null)}>
              <Text style={styles.iosPickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={activeTimeField === 'open' ? openTime : closeTime}
            mode="time"
            display="spinner"
            onChange={handleTimeChange(activeTimeField)}
          />
        </View>
      )}
      {activeTimeField && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={activeTimeField === 'open' ? openTime : closeTime}
          mode="time"
          display="default"
          onChange={handleTimeChange(activeTimeField)}
        />
      )}

      <LocationPickerModal
        visible={mapVisible}
        initial={location ?? undefined}
        onClose={() => setMapVisible(false)}
        onConfirm={setLocation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingCenter: { alignItems: 'center', justifyContent: 'center' },
  hero: {
    height: 180, overflow: 'hidden', justifyContent: 'flex-end', padding: spacing.md,
  },
  heroTop: {
    position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroLogo: { width: 36, height: 36, borderRadius: 10 },
  heroTitle: { ...typography.h1, fontSize: 26, color: colors.white },
  heroSubtitle: { ...typography.body, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionLabel: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  sportRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  sportCard: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  sportLabel: { fontSize: 11, fontWeight: '700', color: colors.text },
  label: { ...typography.label, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  priceInputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md,
  },
  priceInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  slotHint: { ...typography.caption, color: colors.textMuted },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeField: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.background,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  timeText: { color: colors.text, fontWeight: '600' },
  toText: { color: colors.textMuted, fontSize: 12 },
  locationField: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  locationCity: { color: colors.text, fontWeight: '600' },
  locationAddress: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  iosPickerSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    shadowColor: colors.black, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  iosPickerHeader: {
    flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  iosPickerDone: { color: colors.primary, fontWeight: '700', fontSize: 15, padding: spacing.xs },
});
