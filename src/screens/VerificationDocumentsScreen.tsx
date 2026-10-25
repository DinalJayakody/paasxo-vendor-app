import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import ScreenHeader from '@/components/ScreenHeader';
import ScreenGlow from '@/components/ScreenGlow';
import VerificationDocumentsCard from '@/components/VerificationDocumentsCard';

/** Settings → Verification documents: business registration / ID for an approved vendor or trainer. */
export default function VerificationDocumentsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const role = useAuthStore((s) => s.user?.accountType) === 'TRAINER' ? 'TRAINER' : 'VENDOR';

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader
        title="Verification documents"
        subtitle="Business registration and ID"
        compact
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}>
        <VerificationDocumentsCard role={role} />
        <Text style={styles.note}>
          Keep these up to date — the Paasxo team may ask for a new photo if a document expires or is hard to read.
          Verified documents are locked; contact support@paasxo.com to change one.
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md },
  note: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, marginTop: spacing.md, paddingHorizontal: 4 },
});
