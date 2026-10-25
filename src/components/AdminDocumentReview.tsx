import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { VerificationDocument } from '@/types';
import { VerificationDocumentsApi } from '@/api/verificationDocuments';
import { DOC_TYPE_LABELS, StatusChip } from './VerificationDocumentsCard';

interface Props {
  vendorUid: string;
  documents: VerificationDocument[];
  onChanged: () => void;
}

/** Admin: view a provider's private verification documents and approve / reject each one. */
export default function AdminDocumentReview({ vendorUid, documents, onChanged }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [preview, setPreview] = useState<VerificationDocument | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<VerificationDocument | null>(null);
  const [note, setNote] = useState('');

  const review = async (d: VerificationDocument, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    setBusy(d.id);
    try {
      await VerificationDocumentsApi.review(vendorUid, d.id, status, reason);
      onChanged();
    } catch (e: any) {
      Alert.alert('Could not update', e?.response?.data?.message ?? e?.response?.data?.error ?? 'Please try again');
    } finally {
      setBusy(null);
    }
  };

  if (documents.length === 0) {
    return <Text style={styles.empty}>No ID or registration documents uploaded yet.</Text>;
  }

  return (
    <View>
      {documents.map((d) => (
        <View key={d.id} style={styles.row}>
          <Pressable onPress={() => setPreview(d)} accessibilityRole="imagebutton" accessibilityLabel="Open document">
            <Image source={VerificationDocumentsApi.fileSource(d.id)} style={styles.thumb} resizeMode="cover" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{DOC_TYPE_LABELS[d.docType] ?? d.docType}</Text>
            <Text style={styles.date}>Uploaded {new Date(d.createdAt).toLocaleDateString()}</Text>
            <StatusChip status={d.status} colors={colors} />
            {!!d.reviewNote && <Text style={styles.note}>{d.reviewNote}</Text>}
            <View style={styles.actions}>
              {busy === d.id ? <ActivityIndicator color={colors.primary} /> : (
                <>
                  {d.status !== 'APPROVED' && (
                    <TouchableOpacity style={[styles.btn, { borderColor: colors.success }]} onPress={() => review(d, 'APPROVED')}>
                      <Ionicons name="checkmark" size={15} color={colors.success} />
                      <Text style={[styles.btnText, { color: colors.success }]}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {d.status !== 'REJECTED' && (
                    <TouchableOpacity style={[styles.btn, { borderColor: colors.danger }]} onPress={() => { setNote(''); setRejecting(d); }}>
                      <Ionicons name="close" size={15} color={colors.danger} />
                      <Text style={[styles.btnText, { color: colors.danger }]}>Reject</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      ))}

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreview(null)}>
          {preview && <Image source={VerificationDocumentsApi.fileSource(preview.id)} style={styles.previewImage} resizeMode="contain" />}
          <View style={styles.previewClose}><Ionicons name="close" size={22} color={colors.white} /></View>
        </Pressable>
      </Modal>

      <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.dialogBackdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Why is it rejected?</Text>
            <Text style={styles.dialogSub}>The provider sees this and can upload a new photo.</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Photo is blurry — the registration number isn't readable"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              maxLength={300}
              autoFocus
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setRejecting(null)} style={styles.dialogBtn}>
                <Text style={[styles.btnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!note.trim()}
                onPress={() => { const d = rejecting!; setRejecting(null); review(d, 'REJECTED', note.trim()); }}
                style={[styles.dialogBtn, { opacity: note.trim() ? 1 : 0.4 }]}
              >
                <Text style={[styles.btnText, { color: colors.danger }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 13 },
  row: {
    flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  label: { color: colors.text, fontWeight: '700', fontSize: 14 },
  date: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  note: { color: colors.textMuted, fontSize: 12.5, marginTop: 4, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, minHeight: 32, alignItems: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  btnText: { fontWeight: '700', fontSize: 13 },
  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '94%', height: '80%' },
  previewClose: {
    position: 'absolute', top: 56, right: 20, width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  dialogBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  dialog: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  dialogTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  dialogSub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  input: {
    minHeight: 80, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm,
    color: colors.text, marginTop: spacing.md, textAlignVertical: 'top',
  },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  dialogBtn: { paddingVertical: 8, paddingHorizontal: 6 },
});
