import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from '@/navigation/RootNavigator';
import { colors } from '@/theme';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { configurePushNotificationHandler } from '@/lib/push';

// Without this, a push received while the app is in the foreground is
// silently swallowed instead of showing a banner/sound. Must run before
// any screen mounts, so it's called at module scope, not inside a component.
configurePushNotificationHandler();

// Temporary diagnostic net: no adb access to the device that's crashing, so
// surface JS errors that happen outside React's render (event handlers,
// promise rejections) as an alert instead of a silent hard crash. Errors
// during render are caught by <ErrorBoundary> below instead.
const defaultHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  Alert.alert(
    isFatal ? 'Fatal error' : 'Error',
    `${error.message}\n\n${error.stack}`,
  );
  defaultHandler(error, isFatal);
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppShell() {
  const { resolvedTheme } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  // Preload the icon font up front — without this, Ionicons can render as
  // "?" tofu glyphs for a frame (or permanently in some RN/Expo Go builds)
  // before the font finishes loading asynchronously.
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  if (!fontsLoaded) {
    return (
      <View style={styles.splash}>
        <Image source={require('./assets/logo.jpeg')} style={styles.logo} resizeMode="cover" />
        <ActivityIndicator color={colors.white} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark },
  logo: { width: 84, height: 84, borderRadius: 20 },
});
