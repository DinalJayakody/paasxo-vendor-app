import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { radius, spacing, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { MediaItem } from '@/types';
import { PickedMedia } from '@/api/mediaUpload';

const MAX_ITEMS = 20;
const MAX_VIDEO_SECONDS = 120;
const MAX_BYTES = 190 * 1024 * 1024; // backend accepts 200MB; leave headroom
const COLS = 3;
const GAP = 8;

interface Props {
  items: MediaItem[];
  /** Upload one picked file; should resolve once the server has it. */
  onAdd: (media: PickedMedia) => Promise<void>;
  onRemove: (url: string) => Promise<void>;
  /** Width the grid lays out in (defaults to screen width minus 2×16 padding). */
  width?: number;
}

/**
 * Photos & videos of a venue's premises (V7) or a trainer's sessions (T10).
 * Pick several at once from the library; they upload one by one with a
 * progress count. Tap to preview, × to remove.
 */
export default function MediaGalleryEditor({ items, onAdd, onRemove, width }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenW } = useWindowDimensions();
  const gridW = width ?? screenW - 32;
  const tile = Math.floor((gridW - GAP * (COLS - 1)) / COLS);

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [preview, setPreview] = useState<MediaItem | null>(null);

  const remaining = MAX_ITEMS - items.length;

  const pick = async () => {
    if (remaining <= 0) {
      Alert.alert('Gallery full', `You can show up to ${MAX_ITEMS} photos and videos. Remove one to add more.`);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
      videoMaxDuration: MAX_VIDEO_SECONDS,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (res.canceled || !res.assets?.length) return;

    const assets = res.assets.slice(0, remaining);
    const tooBig = assets.filter((a) => (a.fileSize ?? 0) > MAX_BYTES);
    const tooLong = assets.filter((a) => a.type === 'video' && (a.duration ?? 0) / 1000 > MAX_VIDEO_SECONDS + 1);
    const ok = assets.filter((a) => !tooBig.includes(a) && !tooLong.includes(a));

    const failures: string[] = [];
    setProgress({ done: 0, total: ok.length });
    for (let i = 0; i < ok.length; i++) {
      const a = ok[i];
      try {
        await onAdd({ uri: a.uri, mimeType: a.mimeType, fileName: a.fileName, type: a.type as PickedMedia['type'] });
      } catch (e: any) {
        failures.push(e?.response?.data?.error ?? e?.response?.data?.message ?? 'Upload failed');
      }
      setProgress({ done: i + 1, total: ok.length });
    }
    setProgress(null);

    const notes: string[] = [];
    if (tooBig.length) notes.push(`${tooBig.length} file(s) were over 190MB and were skipped.`);
    if (tooLong.length) notes.push(`${tooLong.length} video(s) were longer than ${MAX_VIDEO_SECONDS / 60} minutes and were skipped.`);
    if (failures.length) notes.push([...new Set(failures)].join('\n'));
    if (notes.length) Alert.alert('Some files were not added', notes.join('\n\n'));
  };

  const confirmRemove = (m: MediaItem) => {
    Alert.alert(m.mediaType === 'VIDEO' ? 'Remove video?' : 'Remove photo?', 'Customers will no longer see it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setRemoving(m.url);
          try {
            await onRemove(m.url);
            if (preview?.url === m.url) setPreview(null);
          } catch (e: any) {
            Alert.alert('Could not remove', e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please try again.');
          } finally {
            setRemoving(null);
          }
        },
      },
    ]);
  };

  return (
    <View>
      <View style={styles.grid}>
        {items.map((m) => (
          <Pressable
            key={m.url}
            style={[styles.tile, { width: tile, height: tile }]}
            onPress={() => setPreview(m)}
            accessibilityRole="imagebutton"
            accessibilityLabel={m.mediaType === 'VIDEO' ? 'Video' : 'Photo'}
          >
            {m.mediaType === 'VIDEO' && !m.thumbnailUrl ? (
              <View style={[StyleSheet.absoluteFill, styles.videoTile]}>
                <Ionicons name="videocam" size={26} color="rgba(255,255,255,0.85)" />
              </View>
            ) : (
              <Image source={{ uri: m.thumbnailUrl ?? m.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            )}
            {m.mediaType === 'VIDEO' && (
              <View style={styles.playBadge}>
                <Ionicons name="play" size={12} color={colors.white} />
              </View>
            )}
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => confirmRemove(m)}
              hitSlop={8}
              disabled={removing === m.url}
              accessibilityRole="button"
              accessibilityLabel="Remove"
            >
              {removing === m.url
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Ionicons name="close" size={14} color={colors.white} />}
            </TouchableOpacity>
          </Pressable>
        ))}

        {remaining > 0 && (
          <TouchableOpacity
            style={[styles.tile, styles.addTile, { width: tile, height: tile }]}
            onPress={pick}
            disabled={!!progress}
            accessibilityRole="button"
            accessibilityLabel="Add photos or videos"
          >
            {progress ? (
              <>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.addText}>{progress.done}/{progress.total}</Text>
              </>
            ) : (
              <>
                <Ionicons name="images-outline" size={24} color={colors.primary} />
                <Text style={styles.addText}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.caption}>
        {items.length}/{MAX_ITEMS} · photos and videos up to {MAX_VIDEO_SECONDS / 60} min
      </Text>

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreview(null)}>
          {preview && (preview.mediaType === 'VIDEO' ? (
            <View style={styles.previewVideo}>
              <Ionicons name="videocam" size={44} color={colors.white} />
              <Text style={styles.previewVideoText}>Video uploaded — customers can play it in the Paasxo app.</Text>
            </View>
          ) : (
            <Image source={{ uri: preview.url }} style={styles.previewImage} resizeMode="contain" />
          ))}
          <View style={styles.previewClose}>
            <Ionicons name="close" size={22} color={colors.white} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.primarySoft },
  videoTile: { backgroundColor: '#0F2A44', alignItems: 'center', justifyContent: 'center' },
  playBadge: {
    position: 'absolute', left: 6, bottom: 6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  addTile: {
    alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primaryLight, backgroundColor: colors.surface,
  },
  addText: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
  caption: { marginTop: spacing.sm, fontSize: 12, color: colors.textMuted },
  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '80%' },
  previewVideo: { alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  previewVideoText: { color: '#fff', fontSize: 14, textAlign: 'center' },
  previewClose: {
    position: 'absolute', top: 60, right: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
});
