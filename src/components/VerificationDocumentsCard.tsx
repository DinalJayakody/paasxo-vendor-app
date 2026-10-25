import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Linking, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { radius, spacing, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { VerificationDocument, VerificationDocType } from '@/types';
import { VerificationDocumentsApi } from '@/api/verificationDocuments';

const MAX_DOCS = 8; // mirrors VerificationDocumentService.MAX_PER_OWNER
const MAX_BYTES = 15 * 1024 * 1024;

export const DOC_TYPE_LABELS: Record<VerificationDocType, string> = {
  BUSINESS_REGISTRATION: 'Business registration',
  NATIONAL_ID: 'National ID (NIC)',
  PASSPORT: 'Passport',
  DRIVING_LICENCE: 'Driving licence',
  COACHING_CERTIFICATE: 'Coaching certificate',
};

const VENDOR_TYPES: VerificationDocType[] = ['BUSINESS_REGISTRATION', 'NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENCE'];
const TRAINER_TYPES: VerificationDocType[] = ['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENCE', 'BUSINESS_REGISTRATION', 'COACHING_CERTIFICATE'];

const errorText = (e: any, fallback: string) =>
  e?.response?.data?.message ?? e?.response?.data?.error ?? fallback;

interface Props {
  role: 'VENDOR' | 'TRAINER';
  /** Pending provider only — their in-memory token (store/pendingSession.ts). */
  token?: string | null;
}

/**
 * Upload a business registration or ID for verification ("Ability to upload
 * their business registration or ID"). Photos are private — only the
 * provider and the Paasxo team can open them — and are re-encoded by the
 * server, which also strips location data.
 */
export default function VerificationDocumentsCard({ role, token }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const types = role === 'TRAINER' ? TRAINER_TYPES : VENDOR_TYPES;

  const [docs, setDocs] = useState<VerificationDocument[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [docType, setDocType] = useState<VerificationDocType>(types[0]);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [preview, setPreview] = useState<VerificationDocument | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setDocs(await VerificationDocumentsApi.mine(token));
    } catch (e: any) {
      setLoadError(e?.response?.status === 401
        ? 'Your session has expired. Sign in again to manage your documents.'
        : 'Couldn’t load your documents. Check your connection and try again.');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const upload = async (fromCamera: boolean) => {
    if ((docs?.length ?? 0) >= MAX_DOCS) {
      Alert.alert('Document limit reached', `You can keep up to ${MAX_DOCS} documents. Remove one to add another.`);
      return;
    }
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        fromCamera ? 'Camera access needed' : 'Photo access needed',
        `Allow ${fromCamera ? 'camera' : 'photo'} access in Settings to add your document.`,
        [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }],
      );
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.85,
      exif: false,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    };
    const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    if ((asset.fileSize ?? 0) > MAX_BYTES) {
      Alert.alert('Photo too large', 'Please choose a photo under 15 MB.');
      return;
    }
    setUploading(true);
    try {
      const saved = await VerificationDocumentsApi.upload(docType, asset, token);
      setDocs((prev) => [saved, ...(prev ?? [])]);
    } catch (e: any) {
      Alert.alert('Upload failed', errorText(e, 'Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const remove = (d: VerificationDocument) => {
    Alert.alert('Remove document?', `${DOC_TYPE_LABELS[d.docType]} will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setRemoving(d.id);
          try {
            await VerificationDocumentsApi.remove(d.id, token);
            setDocs((prev) => (prev ?? []).filter((x) => x.id !== d.id));
          } catch (e: any) {
            Alert.alert('Could not remove', errorText(e, 'Please try again.'));
          } finally {
            setRemoving(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}><Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Verification documents</Text>
          <Text style={styles.sub}>
            {role === 'TRAINER'
              ? 'Add your ID, and your business registration or coaching certificate if you have one.'
              : 'Add your business registration and the owner’s ID.'}
          </Text>
        </View>
      </View>

      {docs === null ? (
        loadError ? (
          <TouchableOpacity onPress={load} style={styles.retry} accessibilityRole="button">
            <Text style={styles.errorText}>{loadError}</Text>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        ) : (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
        )
      ) : (
        <>
          {docs.map((d) => (
            <View key={d.id} style={styles.docRow}>
              <Pressable onPress={() => setPreview(d)} accessibilityRole="imagebutton" accessibilityLabel={`View ${DOC_TYPE_LABELS[d.docType]}`}>
                <Image source={VerificationDocumentsApi.fileSource(d.id, token)} style={styles.thumb} resizeMode="cover" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.docLabel}>{DOC_TYPE_LABELS[d.docType] ?? d.docType}</Text>
                <StatusChip status={d.status} colors={colors} />
                {d.status === 'REJECTED' && !!d.reviewNote && (
                  <Text style={styles.rejectNote}>{d.reviewNote}</Text>
                )}
              </View>
              {d.status !== 'APPROVED' && (
                <TouchableOpacity onPress={() => remove(d)} hitSlop={10} disabled={removing === d.id}
                  accessibilityRole="button" accessibilityLabel="Remove document">
                  {removing === d.id
                    ? <ActivityIndicator size="small" color={colors.danger} />
                    : <Ionicons name="trash-outline" size={20} color={colors.danger} />}
                </TouchableOpacity>
              )}
            </View>
          ))}

          {docs.length < MAX_DOCS && (
            <>
              <Text style={styles.pickLabel}>What are you adding?</Text>
              <View style={styles.chips}>
                {types.map((t) => (
                  <TouchableOpacity key={t} onPress={() => setDocType(t)}
                    style={[styles.chip, docType === t && styles.chipOn]}
                    accessibilityRole="radio" accessibilityState={{ selected: docType === t }}>
                    <Text style={[styles.chipText, docType === t && styles.chipTextOn]}>{DOC_TYPE_LABELS[t]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => upload(true)} disabled={uploading}
                  accessibilityRole="button">
                  {uploading ? <ActivityIndicator color={colors.white} /> : (
                    <>
                      <Ionicons name="camera-outline" size={18} color={colors.white} />
                      <Text style={styles.actionPrimaryText}>Take photo</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => upload(false)} disabled={uploading} accessibilityRole="button">
                  <Ionicons name="images-outline" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Choose photo</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <Text style={styles.hint}>
            Make sure the whole document and its text are clear. Only you and the Paasxo team can see these.
          </Text>
        </>
      )}

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreview(null)} accessibilityLabel="Close preview">
          {preview && (
            <Image source={VerificationDocumentsApi.fileSource(preview.id, token)} style={styles.previewImage} resizeMode="contain" />
          )}
          <View style={styles.previewClose}><Ionicons name="close" size={22} color={colors.white} /></View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function StatusChip({ status, colors }: { status: VerificationDocument['status']; colors: ThemeColors }) {
  const map = {
    PENDING: { text: 'Under review', fg: colors.warning, bg: colors.warningLight, icon: 'time-outline' as const },
    APPROVED: { text: 'Verified', fg: colors.success, bg: colors.successLight, icon: 'checkmark-circle-outline' as const },
    REJECTED: { text: 'Needs a new photo', fg: colors.danger, bg: colors.dangerLight, icon: 'alert-circle-outline' as const },
  }[status];
  return (
    <View style={[chipStyles.chip, { backgroundColor: map.bg }]}>
      <Ionicons name={map.icon} size={12} color={map.fg} />
      <Text style={[chipStyles.text, { color: map.fg }]}>{map.text}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
  text: { fontSize: 11.5, fontWeight: '700' },
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  headerRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginBottom: spacing.sm },
  headerIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 15.5, fontWeight: '800' },
  sub: { color: colors.textMuted, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  retry: { alignItems: 'center', paddingVertical: spacing.md, gap: 6 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  retryText: { color: colors.primary, fontWeight: '700' },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  docLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rejectNote: { color: colors.danger, fontSize: 12.5, marginTop: 4 },
  pickLabel: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: spacing.sm, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12.5, fontWeight: '600' },
  chipTextOn: { color: colors.white },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: {
    flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  actionPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  hint: { color: colors.textMuted, fontSize: 11.5, marginTop: spacing.sm, lineHeight: 16 },
  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '94%', height: '80%' },
  previewClose: {
    position: 'absolute', top: 56, right: 20, width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
});
