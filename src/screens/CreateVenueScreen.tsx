import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { CreateVenuePayload, SportType, BackendSport } from '@/types';
import { FutsalApi } from '@/api/futsal';
import { BusinessRegistrationApi } from '@/api/businessRegistration';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import GradientBackground from '@/components/GradientBackground';
import CoverImagePicker from '@/components/CoverImagePicker';
import LocationPickerModal, { PickedLocation } from '@/components/LocationPickerModal';
import ScreenGlow from '@/components/ScreenGlow';
import * as ImagePicker from 'expo-image-picker';

const SPORTS: { key: SportType; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'Futsal', icon: 'football-outline', color: '#22C55E' },
  { key: 'Cricket', icon: 'baseball-outline', color: '#F59E0B' },
  { key: 'Pickleball', icon: 'tennisball-outline', color: '#8B5CF6' },
  { key: 'Paddleball', icon: 'disc-outline', color: '#06B6D4' },
];

const SPORT_TO_BACKEND: Record<SportType, BackendSport> = {
  Futsal: 'FUTSAL',
  Cricket: 'CRICKET',
  Pickleball: 'PICKLEBALL',
  Paddleball: 'PADDLEBALL',
};
const BACKEND_TO_SPORT: Record<BackendSport, SportType> = {
  FUTSAL: 'Futsal',
  CRICKET: 'Cricket',
  PICKLEBALL: 'Pickleball',
  PADDLEBALL: 'Paddleball',
};

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
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const venueId: number | undefined = route?.params?.venueId;
  const isEditing = !!venueId;

  const [sports, setSports] = useState<SportType[]>([]);
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

  // ── Business Registration ──────────────────────────────────────────────
  const [brMode, setBrMode] = useState<'existing' | 'new'>('existing');
  const [selectedBrId, setSelectedBrId] = useState<number | null>(null);
  const [newBrRegNumber, setNewBrRegNumber] = useState('');
  const [newBrBusinessName, setNewBrBusinessName] = useState('');
  const [newBrDocumentUri, setNewBrDocumentUri] = useState<string | undefined>(undefined);
  const [creatingBr, setCreatingBr] = useState(false);

  const { data: existingVenue, isLoading: loadingVenue } = useQuery({
    queryKey: ['venue-detail', venueId],
    queryFn: () => FutsalApi.getById(venueId!),
    enabled: isEditing,
  });

  const { data: myBusinessRegistrations = [] } = useQuery({
    queryKey: ['business-registrations-mine'],
    queryFn: () => BusinessRegistrationApi.mine(),
  });

  useEffect(() => {
    // Default to "new" once we know the vendor has no existing BR to pick from.
    if (myBusinessRegistrations.length === 0) setBrMode('new');
  }, [myBusinessRegistrations.length]);

  const pickBrDocument = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo library access to attach the certificate.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setNewBrDocumentUri(result.assets[0].uri);
    }
  };

  useEffect(() => {
    if (!existingVenue || prefilled) return;
    setName(existingVenue.name);
    setDescription(existingVenue.description ?? '');
    setSports((existingVenue.sports ?? []).map((s) => BACKEND_TO_SPORT[s]).filter(Boolean));
    if (existingVenue.businessRegistrationId) {
      setSelectedBrId(existingVenue.businessRegistrationId);
      setBrMode('existing');
    }
    setPricePerSlot(String(existingVenue.pricePerSlot));
    setOpenTime(parseTimeFromApi(existingVenue.openTime));
    setCloseTime(parseTimeFromApi(existingVenue.closeTime));
    if (existingVenue.imageUrl) {
      setImageUri(existingVenue.imageUrl);
    } else if (existingVenue.imageBase64) {
      setImageUri(`data:image/jpeg;base64,${existingVenue.imageBase64}`); // legacy fallback
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
        isEditing ? 'Venue updated' : 'Venue submitted for review',
        isEditing
          ? `${name} has been updated.`
          : `${name} has been added to your account. Paasxo will review it before it appears to players — you'll get a notification once it's live. Meanwhile, add photos, specialities and availability.`,
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

  const toggleSport = (key: SportType) => {
    setSports((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));
  };

  const handleSubmit = async () => {
    if (sports.length === 0) {
      Alert.alert('Select a sport', 'Choose at least one sport this venue supports.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give your venue a name.');
      return;
    }
    if (brMode === 'new' && (newBrRegNumber.trim() || newBrBusinessName.trim())) {
      // Partial entry — require both fields once either has been started.
      if (!newBrRegNumber.trim() || !newBrBusinessName.trim()) {
        Alert.alert('Incomplete registration', 'Enter both a registration number and business name, or leave both blank to skip.');
        return;
      }
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

    let businessRegistrationId = brMode === 'existing' ? selectedBrId ?? undefined : undefined;
    if (brMode === 'new' && newBrRegNumber.trim() && newBrBusinessName.trim()) {
      setCreatingBr(true);
      try {
        const created = await BusinessRegistrationApi.create(
          { registrationNumber: newBrRegNumber.trim(), businessName: newBrBusinessName.trim() },
          newBrDocumentUri,
        );
        businessRegistrationId = created.id;
        queryClient.invalidateQueries({ queryKey: ['business-registrations-mine'] });
        if (created.documentSkippedReason) {
          // Registration saved fine — only the certificate photo was dropped (too
          // large or an unsupported format). Non-blocking: venue creation continues.
          Alert.alert('Registration saved without certificate photo', created.documentSkippedReason);
        }
      } catch (e: any) {
        Alert.alert(
          'Could not save business registration',
          e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please try again',
        );
        return;
      } finally {
        setCreatingBr(false);
      }
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
      sports: sports.map((s) => SPORT_TO_BACKEND[s]),
      businessRegistrationId,
    });
  };

  // Hero gradient reflects the first selected sport, if any.
  const activeSport = SPORTS.find((s) => s.key === sports[0]);

  if (isEditing && loadingVenue) {
    return (
      <SafeAreaView style={[styles.safe, styles.loadingCenter]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenGlow />
      <View style={styles.hero}>
        <GradientBackground
          colors={activeSport ? [colors.heroStart, activeSport.color] : [colors.heroStart, colors.heroMid, colors.heroEnd]}
        />
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
          <Text style={styles.sectionLabel}>Sports</Text>
          <Text style={styles.sectionHint}>Select every sport that can be played at this venue.</Text>
          <View style={styles.sportRow}>
            {SPORTS.map((s) => {
              const selected = sports.includes(s.key);
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.sportCard, selected && { backgroundColor: s.color, borderColor: s.color }]}
                  onPress={() => toggleSport(s.key)}
                  activeOpacity={0.85}
                >
                  {selected && (
                    <View style={styles.sportCheckBadge}>
                      <Ionicons name="checkmark" size={10} color={s.color} />
                    </View>
                  )}
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

            <Text style={styles.label}>Business Registration (optional)</Text>
            <Text style={styles.sectionHint}>
              Use the same registration as one of your existing venues, or register a new one for this venue.
            </Text>
            <View style={styles.brModeRow}>
              <TouchableOpacity
                style={[styles.brModeBtn, brMode === 'existing' && styles.brModeBtnActive]}
                onPress={() => setBrMode('existing')}
                disabled={myBusinessRegistrations.length === 0}
              >
                <Text style={[styles.brModeBtnText, brMode === 'existing' && styles.brModeBtnTextActive]}>
                  Use Existing
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.brModeBtn, brMode === 'new' && styles.brModeBtnActive]}
                onPress={() => setBrMode('new')}
              >
                <Text style={[styles.brModeBtnText, brMode === 'new' && styles.brModeBtnTextActive]}>
                  Register New
                </Text>
              </TouchableOpacity>
            </View>

            {brMode === 'existing' ? (
              myBusinessRegistrations.length === 0 ? (
                <Text style={styles.slotHint}>No saved business registrations yet — switch to "Register New".</Text>
              ) : (
                <View style={{ gap: spacing.xs }}>
                  {myBusinessRegistrations.map((br) => {
                    const selected = selectedBrId === br.id;
                    return (
                      <TouchableOpacity
                        key={br.id}
                        style={[styles.brOption, selected && styles.brOptionSelected]}
                        onPress={() => setSelectedBrId(br.id)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.locationCity}>{br.businessName}</Text>
                          <Text style={styles.locationAddress}>Reg. No. {br.registrationNumber}</Text>
                        </View>
                        {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            ) : (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Business registration number"
                  placeholderTextColor={colors.textMuted}
                  value={newBrRegNumber}
                  onChangeText={setNewBrRegNumber}
                />
                <TextInput
                  style={[styles.input, { marginTop: spacing.sm }]}
                  placeholder="Registered business name"
                  placeholderTextColor={colors.textMuted}
                  value={newBrBusinessName}
                  onChangeText={setNewBrBusinessName}
                />
                <TouchableOpacity style={styles.brDocPicker} onPress={pickBrDocument}>
                  {newBrDocumentUri ? (
                    <Image source={{ uri: newBrDocumentUri }} style={styles.brDocThumb} />
                  ) : (
                    <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
                  )}
                  <Text style={styles.brDocPickerText}>
                    {newBrDocumentUri ? 'Certificate attached — tap to change' : 'Attach certificate photo (optional)'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <PrimaryButton
              title={isEditing ? 'Save Changes' : 'Create Venue'}
              onPress={handleSubmit}
              loading={mutation.isPending || creatingBr}
              style={{ marginTop: spacing.lg }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {activeTimeField && Platform.OS === 'ios' && (
        <View style={[styles.iosPickerSheet, { paddingBottom: insets.bottom }]}>
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  sectionLabel: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.xs },
  sectionHint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  sportRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  sportCard: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
    position: 'relative',
  },
  sportCheckBadge: {
    position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
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

  brModeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  brModeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  brModeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  brModeBtnText: { fontSize: 12, fontWeight: '700', color: colors.text },
  brModeBtnTextActive: { color: colors.white },
  brOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  brOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  brDocPicker: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm,
    backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.primary, borderStyle: 'dashed', paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  brDocThumb: { width: 28, height: 28, borderRadius: 6 },
  brDocPickerText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.primaryDark },
});
