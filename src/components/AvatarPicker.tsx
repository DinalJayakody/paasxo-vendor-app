import React, { useCallback } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { radius, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  uri?: string;
  onChange: (uri: string) => void;
  size?: number;
}

/** Tappable circular avatar that opens the photo library and returns a local file uri. */
export default function AvatarPicker({ uri, onChange, size = 92 }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const pick = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      onChange(result.assets[0].uri);
    }
  }, [onChange]);

  return (
    <TouchableOpacity
      onPress={pick}
      activeOpacity={0.8}
      style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { borderRadius: size / 2 }]} />
      ) : (
        <View style={[styles.placeholder, { borderRadius: size / 2 }]}>
          <Ionicons name="business" size={size * 0.36} color={colors.primary} />
        </View>
      )}
      <View style={styles.editBadge}>
        <Ionicons name="camera" size={14} color={colors.white} />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  image: { width: '100%', height: '100%' },
  placeholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
