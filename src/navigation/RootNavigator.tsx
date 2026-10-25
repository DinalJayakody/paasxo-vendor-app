import React, { useCallback, useEffect, useRef } from 'react';
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

  // Tapping a push opens the matching screen — the same place tapping that row
  // in NotificationsScreen goes — or the Notifications screen for anything else.
  // Works from every app state: the tap that cold-launched the app is read via
  // getLastNotificationResponseAsync and held until the user is signed in and
  // navigation is ready (it used to be dropped when navigation wasn't ready yet).
  const pendingPush = useRef<Record<string, unknown> | null>(null);
  const handledTaps = useRef(new Set<string>());

  const flushPendingPush = useCallback(() => {
    const data = pendingPush.current;
    if (!data || !navigationRef.isReady() || !isAuthenticated || isHydrating) return;
    pendingPush.current = null;
    if (isAdmin) return; // the admin console has no notifications
    const nav = navigationRef.navigate as unknown as (screen: string, params?: object) => void;
    const toId = (v: unknown) => (typeof v === 'number' || (typeof v === 'string' && /^\d{1,18}$/.test(v)) ? Number(v) : null);
    const bookingId = toId(data.bookingId);
    const slotId = toId(data.trainerSlotId);
    const sessionId = toId(data.trainerSessionId);

    if (!isTrainer && data.type === 'BOOKING_PENDING_VENDOR_APPROVAL' && bookingId) {
      nav('BookingRequestDetail', { bookingId });
    } else if (isTrainer && data.type === 'TRAINER_SESSION_JOINED' && slotId && sessionId) {
      nav('SessionRoster', { sessionId, slotId });
    } else if (isTrainer && data.type === 'TRAINER_PLAN_PURCHASED') {
      nav('TrainerPlans');
    } else if (!isTrainer && data.type === 'VENUE_APPROVED' && toId(data.venueId)) {
      nav('VenueDetail', { venueId: toId(data.venueId) });
    } else {
      nav('Notifications');
    }
    if (typeof data.notificationId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(data.notificationId)) {
      NotificationApi.markRead(data.notificationId).catch(() => {});
    }
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [isAuthenticated, isHydrating, isAdmin, isTrainer, navigationRef]);

  const handlePushResponse = useCallback((response: Notifications.NotificationResponse) => {
    const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
    if (handledTaps.current.has(key)) return; // listener + cold-start lookup can both report one tap
    handledTaps.current.add(key);
    const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
    if (typeof data.type !== 'string') return;
    pendingPush.current = data;
    flushPendingPush();
  }, [flushPendingPush]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(handlePushResponse);
    Notifications.getLastNotificationResponseAsync()
      .then((last) => { if (last) handlePushResponse(last); })
      .catch(() => {});
    return () => sub.remove();
  }, [handlePushResponse]);

  // Sign-in / hydration finishing can be what unblocks a held tap.
  useEffect(() => { flushPendingPush(); }, [flushPendingPush]);

  if (isHydrating) {
    return (
      <View style={[styles.splash, { backgroundColor: c.primaryDark }]}>
        <ActivityIndicator color={colors.white} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={flushPendingPush} theme={buildNavTheme(c, resolvedTheme === 'dark')}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" getComponent={() => require('@/screens/RegisterScreen').default} />
            {/* No separate admin screen — the info@paasxo.com admin signs in through
                this exact same Login form (see LoginScreen's handleSignIn); the
                accountType coming back as 'ADMIN' is what routes here to the
                isAdmin branch below instead of the vendor/trainer one. */}
            {/* Reached after a VENDOR/TRAINER sign-up that's pending manual verification
                (RegisterScreen), or when a pending provider tries to sign in (LoginScreen) —
                both with an in-memory token so they can upload verification documents. */}
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
            <Stack.Screen name="AllDates" getComponent={() => require('@/screens/trainer/AllDatesScreen').default} />
            <Stack.Screen name="TrainerPlans" getComponent={() => require('@/screens/trainer/TrainerPlansScreen').default} />
            <Stack.Screen name="BankAccount" getComponent={() => require('@/screens/BankAccountScreen').default} />
            <Stack.Screen name="VerificationDocuments" getComponent={() => require('@/screens/VerificationDocumentsScreen').default} />
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
            <Stack.Screen name="VerificationDocuments" getComponent={() => require('@/screens/VerificationDocumentsScreen').default} />
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
