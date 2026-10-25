import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { spacing, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import PrimaryButton from '@/components/PrimaryButton';
import AuthShell from '@/components/AuthShell';
import FormInput from '@/components/FormInput';
import { usePendingSession } from '@/store/pendingSession';
import { useAuthStore } from '@/store/authStore';
import { AuthApi } from '@/api/auth';

/**
 * The backend tags a blocked-vendor login with a `code` (see
 * VendorPendingVerificationException.Code) precisely so this screen can show
 * the right title/tone instead of a generic "Sign in failed" for what's
 * actually two very different situations — a fresh registration still
 * awaiting review vs. an account an admin has since deactivated.
 */
function describeSignInError(e: any): { title: string; message: string } {
  const code = e?.response?.data?.code;
  const message = e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please check your credentials';
  if (code === 'DEACTIVATED') {
    return { title: 'Account Temporarily Deactivated', message };
  }
  if (code === 'PENDING_VERIFICATION') {
    return { title: 'Verification Pending', message };
  }
  return { title: 'Sign in failed', message };
}

export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
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
      const data = e?.response?.data;
      if (data?.code === 'PENDING_VERIFICATION' && data?.uploadToken) {
        // Still under review: no sign-in, but they can add or fix verification documents.
        usePendingSession.getState().setToken(data.uploadToken);
        navigation.navigate('PendingVerification', { role: data.accountType === 'TRAINER' ? 'TRAINER' : 'VENDOR', returning: true });
        return;
      }
      const { title, message } = describeSignInError(e);
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your account email above first, then tap "Forgot password?" again.');
      return;
    }
    AuthApi.sendPasswordReset(email.trim().toLowerCase())
      .then(() => Alert.alert('Check your email', `We sent a password reset link to ${email.trim()}.`))
      .catch((e: any) => Alert.alert('Could not send reset email', e?.message ?? 'Please try again.'));
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
        textContentType="username"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <FormInput
        icon="lock-closed-outline"
        placeholder="Password"
        isPassword
        textContentType="password"
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotWrap}>
        <Text style={styles.forgot}>Forgot password?</Text>
      </TouchableOpacity>

      <PrimaryButton title="Sign In" onPress={handleSignIn} loading={loading} style={{ marginTop: spacing.sm }} />
    </AuthShell>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  forgotWrap: { alignSelf: 'flex-end', marginBottom: spacing.xs, marginTop: -4 },
  forgot: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  footerText: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.lg },
  link: { color: colors.primary, fontWeight: '700' },
});
