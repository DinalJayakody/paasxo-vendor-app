import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/theme';
import PrimaryButton from '@/components/PrimaryButton';
import AuthShell from '@/components/AuthShell';
import FormInput from '@/components/FormInput';
import AvatarPicker from '@/components/AvatarPicker';
import SelectChip from '@/components/SelectChip';
import { useAuthStore } from '@/store/authStore';

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }: any) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sports, setSports] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const register = useAuthStore((s) => s.register);

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
      await register(
        {
          displayName: displayName.trim(),
          email: email.trim().toLowerCase(),
          password,
          phoneNumber: phoneNumber.trim() || undefined,
          sports: sports.length ? sports : undefined,
        },
        avatarUri,
      );
    } catch (e: any) {
      Alert.alert('Registration failed', e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Become a Vendor"
      subtitle="Manage your venues, courts & bookings on Paasxo"
      footer={
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.footerText}>
            Already have an account? <Text style={styles.link}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      }
    >
      <AvatarPicker uri={avatarUri} onChange={setAvatarUri} />
      <Text style={styles.avatarHint}>Add a business logo or profile photo (optional)</Text>

      <FormInput
        icon="person-outline"
        placeholder="Business / Manager Name"
        autoCapitalize="words"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <FormInput
        icon="mail-outline"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <FormInput
        icon="call-outline"
        placeholder="+94 71 234 5678"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <FormInput
        icon="lock-closed-outline"
        placeholder="Password"
        isPassword
        value={password}
        onChangeText={setPassword}
      />
      <FormInput
        icon="lock-closed-outline"
        placeholder="Confirm Password"
        isPassword
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Text style={styles.label}>Sports you offer</Text>
      <View style={styles.chipRow}>
        {SPORTS_OPTIONS.map((sport) => (
          <SelectChip
            key={sport.value}
            label={sport.label}
            selected={sports.includes(sport.value)}
            onPress={() => toggleSport(sport.value)}
          />
        ))}
      </View>

      <PrimaryButton
        title="Create Vendor Account"
        onPress={handleRegister}
        loading={loading}
        style={{ marginTop: spacing.sm }}
      />

      <View style={styles.badgeRow}>
        <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
        <Text style={styles.badgeText}>Your data is encrypted and never shared without consent.</Text>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  avatarHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  label: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, marginTop: spacing.md,
  },
  badgeText: { ...typography.caption, color: colors.textMuted },
  footerText: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.lg },
  link: { color: colors.primary, fontWeight: '700' },
});
