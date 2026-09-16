import { create } from 'zustand';
import { DeviceEventEmitter } from 'react-native';
import { storage, AUTH_LOGOUT_EVENT } from '@/api/client';
import { AuthApi, AuthResponseData } from '@/api/auth';
import { NotificationApi } from '@/api/notification';
import { registerForPushNotificationsAsync } from '@/lib/push';
import { AuthUser, RegisterPayload } from '@/types';

/**
 * Best-effort, FIRE-AND-FORGET push-token unregistration — deliberately not
 * awaited by callers. registerForPushNotificationsAsync() can show the OS
 * permission prompt on first call (it never has on this device for an admin
 * session, since RootNavigator skips push registration entirely for
 * accountType 'ADMIN'), and that prompt can sit unanswered indefinitely in
 * Expo Go. Awaiting this from logout()/deleteAccount() meant a stuck prompt
 * silently hung the entire sign-out — tapping "Log Out" looked like it did
 * nothing. A failed/slow unregister only means a stale token that silently
 * fails future pushes, which must never block sign-out itself.
 */
function unregisterPushTokenBestEffort(): void {
  registerForPushNotificationsAsync()
    .then((token) => (token ? NotificationApi.unregisterPushToken(token) : undefined))
    .catch(() => {
      // Non-fatal — see comment above.
    });
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  register: (
    payload: Omit<RegisterPayload, 'accountType'>,
    accountType: 'VENDOR' | 'TRAINER',
    profileImageUri?: string,
  ) => Promise<{ pending: boolean }>;
  // Also used for the info@paasxo.com admin sign-in — typed into this exact
  // same LoginScreen, no separate admin screen. It's a real Firebase-backed
  // account (see backend's AdminAccountSeeder), not a separate auth
  // mechanism, so it's just this same call with accountType
  // coming back as 'ADMIN' in the response.
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

function mapUser(data: AuthResponseData): AuthUser {
  return {
    id: data.user.id,
    email: data.user.email,
    displayName: data.user.displayName,
    phoneNumber: data.user.phoneNumber ?? undefined,
    profileImageUrl: data.user.profileImageUrl ?? undefined,
    accountType: data.user.accountType,
    sports: data.user.sports ?? undefined,
    active: data.user.active ?? undefined,
  };
}

/**
 * idToken/refreshToken here are real Firebase tokens (this backend has no
 * custom-issued JWT) — idToken is what the request interceptor sends as the
 * Bearer token, refreshToken is what the response interceptor exchanges for
 * a new idToken once it expires (Firebase ID tokens expire hourly).
 */
async function persistSession(data: AuthResponseData): Promise<AuthUser> {
  await storage.set('accessToken', data.idToken);
  await storage.set('refreshToken', data.refreshToken);
  const user = mapUser(data);
  await storage.set('authUser', JSON.stringify(user));
  return user;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isHydrating: true,

  hydrate: async () => {
    try {
      await storage.hydrate();
      const token = storage.getString('accessToken');
      const userJson = await storage.getStringAsync('authUser');
      if (token && userJson) {
        set({ user: JSON.parse(userJson), isAuthenticated: true });
      }
    } catch {
      // No valid persisted session — fall through to the login screen.
    } finally {
      set({ isHydrating: false });
    }
  },

  register: async (payload, accountType, profileImageUri) => {
    const data = await AuthApi.register({ ...payload, accountType }, profileImageUri);
    // A freshly-registered VENDOR is created inactive pending manual verification
    // (see AuthService#register) — their Firebase account exists so the same
    // credentials work once approved, but they must NOT be signed into the app
    // yet. Trainer registration is unaffected (always active: true).
    if (accountType === 'VENDOR' && data.user.active === false) {
      return { pending: true };
    }
    const user = await persistSession(data);
    set({ user, isAuthenticated: true });
    return { pending: false };
  },

  loginWithEmailPassword: async (email: string, password: string) => {
    const data = await AuthApi.login(email, password);
    const user = await persistSession(data);
    set({ user, isAuthenticated: true });
  },

  loginWithGoogle: async (idToken: string) => {
    const data = await AuthApi.loginWithGoogle(idToken);
    const user = await persistSession(data);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    unregisterPushTokenBestEffort();
    await storage.delete('accessToken');
    await storage.delete('refreshToken');
    await storage.delete('authUser');
    set({ user: null, isAuthenticated: false });
  },

  deleteAccount: async () => {
    unregisterPushTokenBestEffort();
    await AuthApi.deleteAccount();
    await storage.delete('accessToken');
    await storage.delete('refreshToken');
    await storage.delete('authUser');
    set({ user: null, isAuthenticated: false });
  },
}));

// A dead refresh token (client.ts's refreshAccessToken) clears the token
// cache there, but has no way to update this store directly without a
// circular import - it emits AUTH_LOGOUT_EVENT instead, and this is what
// actually returns the UI to the login screen instead of silently leaving
// every future request unauthenticated.
DeviceEventEmitter.addListener(AUTH_LOGOUT_EVENT, () => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});
