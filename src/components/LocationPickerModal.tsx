import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert, TextInput, Keyboard } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme';
import PrimaryButton from './PrimaryButton';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  city: string;
  formattedAddress: string;
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
  const [region, setRegion] = useState<Region>(
    initial ? { ...initial, latitudeDelta: 0.05, longitudeDelta: 0.05 } : DEFAULT_REGION,
  );
  const [marker, setMarker] = useState(initial ?? { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const search = useCallback(async () => {
    const query = searchText.trim();
    if (!query) return;
    Keyboard.dismiss();
    setSearching(true);
    setSearchError(null);
    try {
      const results = await Location.geocodeAsync(query);
      if (!results.length) {
        setSearchError('No matches — try a different search or drop the pin manually.');
        return;
      }
      const best = results[0];
      const next = { latitude: best.latitude, longitude: best.longitude };
      setMarker(next);
      const nextRegion = { ...next, latitudeDelta: 0.02, longitudeDelta: 0.02 };
      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 500);
    } catch {
      setSearchError('Search failed — check your connection and try again.');
    } finally {
      setSearching(false);
    }
  }, [searchText]);

  const useMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow location access to use your current position.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setMarker(next);
      const nextRegion = { ...next, latitudeDelta: 0.02, longitudeDelta: 0.02 };
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
          initialRegion={region}
          onPress={(e) => setMarker(e.nativeEvent.coordinate)}
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
                onSubmitEditing={search}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={search} disabled={searching || !searchText.trim()}>
              {searching ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Ionicons name="arrow-forward" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.hint}>
            <Text style={styles.hintText}>
              {searchError ?? "Search, or tap/drag the pin to set your venue's location"}
            </Text>
          </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    position: 'absolute', top: 56, left: spacing.md, right: spacing.md, gap: spacing.sm,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.black, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.white,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 40,
    shadowColor: colors.black, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },
  hint: {
    backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10,
    shadowColor: colors.black, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  hintText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  myLocationBtn: {
    position: 'absolute', right: spacing.md, bottom: 120,
    width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.black, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  bottomBar: {
    position: 'absolute', left: spacing.md, right: spacing.md, bottom: 48,
  },
});
