import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';
import PrimaryButton from '@/components/PrimaryButton';
import AuthShell from '@/components/AuthShell';
import FormInput from '@/components/FormInput';
import { useAuthStore } from '@/store/authStore';

/**
 * Real Google sign-in requires native Firebase SDK setup (expo-auth-session
 * or @react-native-firebase/auth) which depends on your Firebase project
 * config (paasxo-a3769) - wire that in where marked below. Once wired, call
 * loginWithGoogle(realFirebaseIdToken), which hits POST /auth/login-google.
 */
export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const loginWithEmailPassword = useAuthStore((s) => s.loginWithEmailPassword);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password to sign in.');
      return;
    }
    setLoading(true);
    try {
      await loginWithEmailPassword(email.trim().toLowerCase(), password);
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please check your credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = (provider: 'Google' | 'Apple') => {
    // TODO: integrate expo-auth-session / native Firebase social auth,
    // then call loginWithGoogle(realFirebaseIdToken).
    Alert.alert(`${provider} sign-in`, 'Wire up native Firebase social auth here, then call loginWithGoogle().');
  };

  return (
    <AuthShell
      title="Paasxo Vendor"
      subtitle="Elite Sports Venue Management"
      footer={
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.footerText}>
            Don't have an account? <Text style={styles.link}>Sign Up for free</Text>
          </Text>
        </TouchableOpacity>
      }
    >
      <FormInput
        icon="mail-outline"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <FormInput
        icon="lock-closed-outline"
        placeholder="Password"
        isPassword
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        onPress={() => Alert.alert('Forgot password', 'Hook up password-reset flow here.')}
        style={styles.forgotWrap}
      >
        <Text style={styles.forgot}>Forgot password?</Text>
      </TouchableOpacity>

      <PrimaryButton title="Sign In" onPress={handleSignIn} loading={loading} style={{ marginTop: spacing.sm }} />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialSignIn('Google')}>
          <Ionicons name="logo-google" size={16} color={colors.text} />
          <Text style={styles.socialText}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialSignIn('Apple')}>
          <Ionicons name="logo-apple" size={16} color={colors.text} />
          <Text style={styles.socialText}>Apple</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  forgotWrap: { alignSelf: 'flex-end', marginBottom: spacing.xs, marginTop: -4 },
  forgot: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: spacing.sm, color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  socialRow: { flexDirection: 'row', gap: spacing.sm },
  socialButton: {
    flex: 1, flexDirection: 'row', gap: 8, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  socialText: { fontWeight: '700', color: colors.text },
  footerText: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.lg },
  link: { color: colors.primary, fontWeight: '700' },
});
