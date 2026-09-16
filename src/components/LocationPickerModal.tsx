import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert, TextInput, Keyboard, ScrollView } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import PrimaryButton from './PrimaryButton';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  city: string;
  formattedAddress: string;
}

interface PlaceSuggestion {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

// Free, keyless place search (OpenStreetMap Nominatim). See usage policy:
// https://operations.osmfoundation.org/policies/nominatim/
const SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

async function fetchPlaceSuggestions(query: string, signal: AbortSignal): Promise<PlaceSuggestion[]> {
  const url = `${SEARCH_ENDPOINT}?format=jsonv2&addressdetails=0&limit=6&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'PaasxoVendorApp/1.0',
    },
  });
  if (!response.ok) throw new Error('Search request failed');
  const data: Array<{ place_id: number; display_name: string; lat: string; lon: string }> = await response.json();
  return data.map((item) => {
    const [name, ...rest] = item.display_name.split(',');
    return {
      placeId: String(item.place_id),
      name: name.trim(),
      address: rest.join(',').trim(),
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    };
  });
}

interface Props {
  visible: boolean;
  initial?: { latitude: number; longitude: number };
  onClose: () => void;
  onConfirm: (location: PickedLocation) => void;
}

// Colombo, Sri Lanka — sensible default center for Paasxo's primary market.
const DEFAULT_REGION: Region = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function LocationPickerModal({ visible, initial, onClose, onConfirm }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [region, setRegion] = useState<Region>(
    initial ? { ...initial, latitudeDelta: 0.05, longitudeDelta: 0.05 } : DEFAULT_REGION,
  );
  const [marker, setMarker] = useState(initial ?? { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const mapRef = useRef<MapView>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipNextSearchRef = useRef(false);

  useEffect(() => {
    const query = searchText.trim();

    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (query.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setSuggestions([]);
      setShowSuggestions(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchError(null);
    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const results = await fetchPlaceSuggestions(query, controller.signal);
        setSuggestions(results);
        setShowSuggestions(true);
        if (!results.length) setSearchError('No matches — try a different search or drop the pin manually.');
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setSearchError('Search failed — check your connection and try again.');
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchText]);

  const selectSuggestion = useCallback((place: PlaceSuggestion) => {
    const next = { latitude: place.latitude, longitude: place.longitude };
    setMarker(next);
    const nextRegion = { ...next, latitudeDelta: 0.02, longitudeDelta: 0.02 };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 500);
    skipNextSearchRef.current = true;
    setSearchText(place.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError(null);
    Keyboard.dismiss();
  }, []);

  const search = useCallback(async () => {
    Keyboard.dismiss();
    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
      return;
    }
    const query = searchText.trim();
    if (query.length < MIN_QUERY_LENGTH) return;
    setSearching(true);
    setSearchError(null);
    try {
      const results = await fetchPlaceSuggestions(query, new AbortController().signal);
      if (!results.length) {
        setSearchError('No matches — try a different search or drop the pin manually.');
        return;
      }
      selectSuggestion(results[0]);
    } catch {
      setSearchError('Search failed — check your connection and try again.');
    } finally {
      setSearching(false);
    }
  }, [searchText, suggestions, selectSuggestion]);

  const useMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      // Distinct from app-level permission below — Location Services can be off
      // system-wide (Settings > Privacy), in which case requestForegroundPermissionsAsync
      // resolves without ever prompting and the button would otherwise silently do
      // nothing, leaving the map sitting on its default region with no explanation.
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Location services are off',
          'Turn on Location Services for this device in Settings, then try again.',
        );
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow location access to use your current position.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setMarker(next);
      const nextRegion = { ...next, latitudeDelta: 0.02, longitudeDelta: 0.02 };
      // Both matter: setRegion is what actually moves the now-controlled MapView
      // (see `region`/`onRegionChangeComplete` below) — animateToRegion on top of
      // it just makes that move an eased animation instead of an instant jump,
      // and is safe to skip if the native map ref isn't mounted yet.
      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 500);
    } catch {
      Alert.alert('Location unavailable', 'Could not fetch your current location. Please pick a spot on the map instead.');
    } finally {
      setLocating(false);
    }
  }, []);

  const confirm = useCallback(async () => {
    setConfirming(true);
    try {
      const results = await Location.reverseGeocodeAsync(marker);
      const place = results[0];
      const city = place?.city || place?.subregion || place?.region || place?.name || 'Unknown location';
      const formattedAddress = [place?.street, city, place?.region, place?.country]
        .filter(Boolean)
        .join(', ');
      onConfirm({ latitude: marker.latitude, longitude: marker.longitude, city, formattedAddress });
      onClose();
    } catch {
      Alert.alert('Could not resolve address', 'Please try picking the location again.');
    } finally {
      setConfirming(false);
    }
  }, [marker, onConfirm, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={(e) => { setShowSuggestions(false); setMarker(e.nativeEvent.coordinate); }}
          onPanDrag={() => setShowSuggestions(false)}
        >
          <Marker
            coordinate={marker}
            draggable
            onDragEnd={(e) => setMarker(e.nativeEvent.coordinate)}
          />
        </MapView>

        <View style={styles.topBar}>
          <View style={styles.searchRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a place or address"
                placeholderTextColor={colors.textMuted}
                value={searchText}
                onChangeText={(t) => { setSearchText(t); setSearchError(null); }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                onSubmitEditing={search}
                returnKeyType="search"
              />
              {searching && <ActivityIndicator color={colors.textMuted} size="small" />}
              {!searching && searchText.length > 0 && (
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => { setSearchText(''); setSuggestions([]); setShowSuggestions(false); setSearchError(null); }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={search} disabled={searching || !searchText.trim()}>
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {showSuggestions && suggestions.length > 0 ? (
            <View style={styles.suggestionsBox}>
              <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
                {suggestions.map((item, index) => (
                  <TouchableOpacity
                    key={item.placeId}
                    style={[styles.suggestionRow, index < suggestions.length - 1 && styles.suggestionDivider]}
                    onPress={() => selectSuggestion(item)}
                  >
                    <Ionicons name="location-outline" size={18} color={colors.textMuted} style={styles.suggestionIcon} />
                    <View style={styles.suggestionTextWrap}>
                      <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
                      {!!item.address && (
                        <Text style={styles.suggestionAddress} numberOfLines={1}>{item.address}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            !!searchError && (
              <View style={styles.hint}>
                <Text style={styles.hintText}>{searchError}</Text>
              </View>
            )
          )}

          {!showSuggestions && !searchError && (
            <View style={styles.hint}>
              <Text style={styles.hintText}>Search, or tap/drag the pin to set your venue's location</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.myLocationBtn} onPress={useMyLocation} disabled={locating}>
          {locating ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Ionicons name="locate" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>

        <View style={styles.bottomBar}>
          <PrimaryButton
            title="Confirm Location"
            onPress={confirm}
            loading={confirming}
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    position: 'absolute', top: 56, left: spacing.md, right: spacing.md, gap: spacing.sm,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.black, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 40,
    shadowColor: colors.black, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },
  hint: {
    backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10,
    shadowColor: colors.black, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  hintText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  suggestionsBox: {
    maxHeight: 280, backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden',
    shadowColor: colors.black, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.md, gap: spacing.sm },
  suggestionDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  suggestionIcon: { marginTop: 1 },
  suggestionTextWrap: { flex: 1 },
  suggestionName: { ...typography.body, color: colors.text, fontWeight: '600' },
  suggestionAddress: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  myLocationBtn: {
    position: 'absolute', right: spacing.md, bottom: 120,
    width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.black, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  bottomBar: {
    position: 'absolute', left: spacing.md, right: spacing.md, bottom: 48,
  },
});
