import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { colors, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { registerForPushNotificationsAsync } from '@/lib/push';
import { NotificationApi } from '@/api/notification';
import GlassTabBar from '@/components/GlassTabBar';

import LoginScreen from '@/screens/LoginScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function tabIcon(active: keyof typeof Ionicons.glyphMap, inactive: keyof typeof Ionicons.glyphMap) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

// React Navigation paints its own chrome (stack transition backdrop, tab bar)
// using this theme independently of what each screen renders — without it,
// that chrome defaults to react-navigation's built-in light theme (white)
// regardless of app dark mode. See src/context/ThemeContext.tsx.
function buildNavTheme(c: ThemeColors, dark: boolean): Theme {
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.danger,
    },
  };
}

// Every screen below Login/Register is loaded via `getComponent` (a deferred
// `require`) instead of a top-level `import`. All ~20 screens — several
// pulling in heavy native deps like react-native-maps and the date picker —
// otherwise get evaluated on the JS thread the instant the app boots, right
// as the user is trying to tap into the email/password field on the very
// first screen they see. That startup-eval burst was intermittently eating
// the earliest touches (screen flash, took several taps for the keyboard to
// show). Deferring it means only Login's own module runs at cold start;
// everything else evaluates on first navigation to it.
function MainTabs() {
  const { colors: c } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <GlassTabBar {...props} activeTintColor={c.primary} />}
    >
      <Tab.Screen name="Dashboard" getComponent={() => require('@/screens/DashboardScreen').default} options={{ tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tab.Screen name="Bookings" getComponent={() => require('@/screens/BookingsScreen').default} options={{ tabBarIcon: tabIcon('calendar', 'calendar-outline') }} />
      <Tab.Screen name="Payments" getComponent={() => require('@/screens/PaymentHistoryScreen').default} options={{ tabBarIcon: tabIcon('card', 'card-outline') }} />
      <Tab.Screen name="Settings" getComponent={() => require('@/screens/SettingsScreen').default} options={{ tabBarIcon: tabIcon('settings', 'settings-outline') }} />
    </Tab.Navigator>
  );
}

/** Trainer-role tab set — same app, distinct screens + orange accent (see useRoleTheme()). */
function TrainerMainTabs() {
  const { colors: c } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <GlassTabBar {...props} activeTintColor={c.trainerAccent} />}
    >
      <Tab.Screen name="TrainerDashboard" getComponent={() => require('@/screens/trainer/TrainerDashboardScreen').default} options={{ title: 'Dashboard', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tab.Screen name="TrainerSessions" getComponent={() => require('@/screens/trainer/TrainerSessionsScreen').default} options={{ title: 'Sessions', tabBarIcon: tabIcon('barbell', 'barbell-outline') }} />
      <Tab.Screen name="Payments" getComponent={() => require('@/screens/PaymentHistoryScreen').default} options={{ tabBarIcon: tabIcon('card', 'card-outline') }} />
      <Tab.Screen name="Settings" getComponent={() => require('@/screens/SettingsScreen').default} options={{ tabBarIcon: tabIcon('settings', 'settings-outline') }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isAuthenticated, isHydrating, hydrate } = useAuthStore();
  const { colors: c, resolvedTheme } = useTheme();
  const isAdmin = user?.accountType === 'ADMIN';
  const isTrainer = user?.accountType === 'TRAINER';
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    hydrate();
  }, []);

  // Register this device for push as soon as the vendor/trainer is signed
  // in — the backend's ApnsPushService needs a token on file before it can
  // deliver anything (e.g. a new booking request while the app isn't open).
  // The admin console has no push notifications of its own, so skip it there.
  useEffect(() => {
    if (!isAuthenticated || isAdmin) return;
    registerForPushNotificationsAsync().then((token) => {
      if (token) NotificationApi.registerPushToken(token).catch(() => {});
    });
  }, [isAuthenticated, isAdmin]);

  // Tapping a push (app backgrounded/killed) deep-links the same way tapping
  // the equivalent row in NotificationsScreen already does.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { type?: string; bookingId?: number } | undefined;
      if (data?.type === 'BOOKING_PENDING_VENDOR_APPROVAL' && data.bookingId && navigationRef.isReady()) {
        (navigationRef.navigate as any)('BookingRequestDetail', { bookingId: data.bookingId });
      }
    });
    return () => sub.remove();
  }, []);

  if (isHydrating) {
    return (
      <View style={[styles.splash, { backgroundColor: c.primaryDark }]}>
        <ActivityIndicator color={colors.white} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={buildNavTheme(c, resolvedTheme === 'dark')}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" getComponent={() => require('@/screens/RegisterScreen').default} />
            {/* No separate admin screen — the info@paasxo.com admin signs in through
                this exact same Login form (see LoginScreen's handleSignIn); the
                accountType coming back as 'ADMIN' is what routes here to the
                isAdmin branch below instead of the vendor/trainer one. */}
            {/* Reached only via RegisterScreen's navigation.reset after a VENDOR
                sign-up that's pending manual verification (see authStore.register). */}
            <Stack.Screen name="PendingVerification" getComponent={() => require('@/screens/PendingVerificationScreen').default} />
          </>
        ) : isAdmin ? (
          <>
            <Stack.Screen name="AdminMain" getComponent={() => require('@/screens/admin/AdminVendorListScreen').default} />
            <Stack.Screen name="AdminVendorDetail" getComponent={() => require('@/screens/admin/AdminVendorDetailScreen').default} />
            <Stack.Screen name="AdminVendorVenues" getComponent={() => require('@/screens/admin/AdminVendorVenuesScreen').default} />
            <Stack.Screen name="AdminVendorBookings" getComponent={() => require('@/screens/admin/AdminVendorBookingsScreen').default} />
            <Stack.Screen name="AdminVendorPayments" getComponent={() => require('@/screens/admin/AdminVendorPaymentsScreen').default} />
            <Stack.Screen name="AdminVendorPayouts" getComponent={() => require('@/screens/admin/AdminVendorPayoutsScreen').default} />
          </>
        ) : isTrainer ? (
          <>
            <Stack.Screen name="MainTabs" component={TrainerMainTabs} />
            <Stack.Screen name="EditTrainerProfile" getComponent={() => require('@/screens/trainer/EditTrainerProfileScreen').default} />
            <Stack.Screen name="CreateSession" getComponent={() => require('@/screens/trainer/CreateSessionScreen').default} />
            <Stack.Screen name="SessionDetail" getComponent={() => require('@/screens/trainer/SessionDetailScreen').default} />
            <Stack.Screen name="ManageSessionAvailability" getComponent={() => require('@/screens/trainer/ManageSessionAvailabilityScreen').default} />
            <Stack.Screen name="SessionRoster" getComponent={() => require('@/screens/trainer/SessionRosterScreen').default} />
            <Stack.Screen name="Subscription" getComponent={() => require('@/screens/SubscriptionScreen').default} />
            <Stack.Screen name="Notifications" getComponent={() => require('@/screens/NotificationsScreen').default} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="CreateVenue" getComponent={() => require('@/screens/CreateVenueScreen').default} />
            <Stack.Screen name="VenueDetail" getComponent={() => require('@/screens/VenueDetailScreen').default} />
            <Stack.Screen name="ManageAvailability" getComponent={() => require('@/screens/ManageAvailabilityScreen').default} />
            <Stack.Screen name="BankAccount" getComponent={() => require('@/screens/BankAccountScreen').default} />
            <Stack.Screen name="Subscription" getComponent={() => require('@/screens/SubscriptionScreen').default} />
            <Stack.Screen name="Notifications" getComponent={() => require('@/screens/NotificationsScreen').default} />
            <Stack.Screen
              name="BookingRequestDetail"
              getComponent={() => require('@/screens/BookingRequestDetailScreen').default}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark },
});
