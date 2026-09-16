import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, typography, paletteForRole, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import PrimaryButton from '@/components/PrimaryButton';
import AuthShell from '@/components/AuthShell';
import FormInput from '@/components/FormInput';
import AvatarPicker from '@/components/AvatarPicker';
import SelectChip from '@/components/SelectChip';
import { useAuthStore } from '@/store/authStore';
import { TrainerCategory } from '@/types';

// Values must match the backend's Sport enum exactly (CRICKET, FOOTBALL,
// FUTSAL, PICKLEBALL, PADDLEBALL, TRAINER_GYM) — anything else is silently
// dropped by AuthService's Sport.valueOf(...) parsing.
const SPORTS_OPTIONS = [
  { label: 'Futsal', value: 'FUTSAL' },
  { label: 'Cricket', value: 'CRICKET' },
  { label: 'Pickleball', value: 'PICKLEBALL' },
  { label: 'Paddleball', value: 'PADDLEBALL' },
  { label: 'Football', value: 'FOOTBALL' },
];

// Values must match the backend's TrainerCategory enum exactly.
const TRAINER_CATEGORY_OPTIONS: { label: string; value: TrainerCategory }[] = [
  { label: 'Gym', value: 'GYM' },
  { label: 'Calisthenics', value: 'CALISTHENICS' },
  { label: 'Dancing', value: 'DANCING' },
  { label: 'Yoga', value: 'YOGA' },
  { label: 'CrossFit', value: 'CROSSFIT' },
  { label: 'Martial Arts', value: 'MARTIAL_ARTS' },
  { label: 'Pilates', value: 'PILATES' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [role, setRole] = useState<'VENDOR' | 'TRAINER'>('VENDOR');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sports, setSports] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const register = useAuthStore((s) => s.register);
  const palette = paletteForRole(role, colors);

  const toggleSport = (sport: string) => {
    setSports((prev) => (prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]));
  };

  const validate = (): string | null => {
    if (!displayName.trim()) return 'Business / manager name is required.';
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleRegister = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Check your details', error);
      return;
    }
    setLoading(true);
    try {
      const { pending } = await register(
        {
          displayName: displayName.trim(),
          email: email.trim().toLowerCase(),
          password,
          phoneNumber: phoneNumber.trim() || undefined,
          sports: sports.length ? sports : undefined,
        },
        role,
        avatarUri,
      );
      // A pending VENDOR isn't signed in (see authStore.register) — RootNavigator
      // won't auto-switch, so send them to the explanation screen ourselves.
      // Reset (not navigate) so Back can't return to this form or a stale session.
      if (pending) {
        navigation.reset({ index: 0, routes: [{ name: 'PendingVerification' }] });
      }
    } catch (e: any) {
      Alert.alert('Registration failed', e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={role === 'TRAINER' ? 'Become a Trainer' : 'Become a Vendor'}
      subtitle={role === 'TRAINER'
        ? 'Run sessions, manage your schedule & get discovered on Paasxo'
        : 'Manage your venues, courts & bookings on Paasxo'}
      footer={
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.footerText}>
            Already have an account? <Text style={styles.link}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      }
    >
      <Text style={styles.label}>I am a</Text>
      <View style={styles.roleRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setRole('VENDOR')}
          style={[styles.roleCard, role === 'VENDOR' && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
        >
          <Ionicons name="storefront-outline" size={22} color={role === 'VENDOR' ? colors.primary : colors.textMuted} />
          <Text style={[styles.roleCardTitle, role === 'VENDOR' && { color: colors.primary }]}>Vendor</Text>
          <Text style={styles.roleCardSub}>List venues & courts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setRole('TRAINER')}
          style={[styles.roleCard, role === 'TRAINER' && { borderColor: palette.accent, backgroundColor: palette.accentLight }]}
        >
          <Ionicons name="barbell-outline" size={22} color={role === 'TRAINER' ? palette.accent : colors.textMuted} />
          <Text style={[styles.roleCardTitle, role === 'TRAINER' && { color: palette.accent }]}>Trainer</Text>
          <Text style={styles.roleCardSub}>Run training sessions</Text>
        </TouchableOpacity>
      </View>

      <AvatarPicker uri={avatarUri} onChange={setAvatarUri} />
      <Text style={styles.avatarHint}>Add a business logo or profile photo (optional)</Text>

      <FormInput
        icon="person-outline"
        placeholder="Business / Manager Name"
        autoCapitalize="words"
        textContentType="name"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <FormInput
        icon="mail-outline"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="username"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <FormInput
        icon="call-outline"
        placeholder="+94 71 234 5678"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <FormInput
        icon="lock-closed-outline"
        placeholder="Password"
        isPassword
        textContentType="newPassword"
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
      />
      <FormInput
        icon="lock-closed-outline"
        placeholder="Confirm Password"
        isPassword
        textContentType="newPassword"
        autoComplete="new-password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Text style={styles.label}>{role === 'TRAINER' ? 'Your training specialties' : 'Sports you offer'}</Text>
      <View style={styles.chipRow}>
        {(role === 'TRAINER' ? TRAINER_CATEGORY_OPTIONS : SPORTS_OPTIONS).map((opt) => (
          <SelectChip
            key={opt.value}
            label={opt.label}
            selected={sports.includes(opt.value)}
            onPress={() => toggleSport(opt.value)}
          />
        ))}
      </View>

      <PrimaryButton
        title={role === 'TRAINER' ? 'Create Trainer Account' : 'Create Vendor Account'}
        onPress={handleRegister}
        loading={loading}
        style={role === 'TRAINER'
          ? { marginTop: spacing.sm, backgroundColor: palette.accent, shadowColor: palette.accent }
          : { marginTop: spacing.sm }}
      />

      <View style={styles.badgeRow}>
        <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
        <Text style={styles.badgeText}>Your data is encrypted and never shared without consent.</Text>
      </View>
    </AuthShell>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatarHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  label: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  roleCard: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  roleCardTitle: { fontWeight: '800', color: colors.text, fontSize: 14 },
  roleCardSub: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, marginTop: spacing.md,
  },
  badgeText: { ...typography.caption, color: colors.textMuted },
  footerText: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.lg },
  link: { color: colors.primary, fontWeight: '700' },
});
