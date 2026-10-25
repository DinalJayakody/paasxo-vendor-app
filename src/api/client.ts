import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, Platform } from 'react-native';
import Constants from 'expo-constants';

// Emitted when a token refresh permanently fails (refresh token itself is
// dead) - authStore listens for this and clears isAuthenticated/user so the
// UI actually returns to the login screen. Without this, storage.delete()
// below only clears the token cache this file uses; the Zustand store still
// believed the session was valid, so every subsequent request kept firing
// with no Authorization header, 401'ing forever with no visible sign-out.
export const AUTH_LOGOUT_EVENT = 'VENDOR_AUTH_LOGOUT';

// Single backend for both the User App and Vendor/Trainer App: mobile-app-paasxo.
// It authenticates via real Firebase ID tokens (not a custom-issued JWT) —
// idToken/refreshToken below are literally Firebase's, proxied through this
// Spring Boot service. See authStore.ts / api/auth.ts for the full flow.
//
// iOS Simulator     → http://localhost:8080/api/
// Android Emulator  → http://10.0.2.2:8080/api/
// Physical device   → auto-detected from the LAN IP Expo Go is already
//                      connected through (no manual IP editing, ever)
//
// Hostinger VPS — production backend. Tried first on every app launch (same
// pattern as the sibling User App's src/api/axios.ts); falls back to the local
// URL below if it doesn't answer within HOSTINGER_PROBE_TIMEOUT_MS. Without
// this probe, this app would only ever reach a local dev server, while the
// User App (which does probe) could end up talking to a different backend —
// trainer sessions created here wouldn't be visible there off the dev machine.
// Set to undefined to disable the probe entirely (e.g. while testing a feature,
// like Trainer, that only exists on the local backend and hasn't been deployed
// to Hostinger yet) — resolvePreferredBaseUrl() below skips straight to local.
// Trailing slash required — resolvePreferredBaseUrl's health check below and every
// request built from this value assume one, same as resolveLocalBaseUrl()'s "/api/".
export const HOSTINGER_URL: string | undefined = 'https://www.paasxo.com/api/';
// 3s was too aggressive for a real Spring Boot cold start (fresh container, JPA/
// Hibernate/Mongo/Firebase all initializing) — nginx returns a 502 in the
// meantime, which reads as "Hostinger is down" and permanently (for the rest of
// that app session) falls back to local instead. See resolvePreferredBaseUrl's
// retry below for the other half of this fix.
export const HOSTINGER_PROBE_TIMEOUT_MS = 8000;

function resolveLocalBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  const lanHost = hostUri?.split(':')[0];
  const isLanIp = !!lanHost && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(lanHost);
  if (isLanIp) return `http://${lanHost}:8080/api/`;

  if (Platform.OS === 'android') return 'http://10.0.2.2:8080/api/';
  return 'http://localhost:8080/api/';
}

export const LOCAL_FALLBACK_URL = resolveLocalBaseUrl();
export let API_BASE_URL = LOCAL_FALLBACK_URL;

// In-memory token cache so the request interceptor can read synchronously.
// Always kept in sync with AsyncStorage via the helpers below.
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export const storage = {
  getString: (key: string): string | null => {
    // Synchronous read only works for the in-memory token cache.
    // Other keys fall back to null here; use getStringAsync for them.
    if (key === 'accessToken') return _accessToken;
    if (key === 'refreshToken') return _refreshToken;
    return null;
  },
  getStringAsync: async (key: string): Promise<string | null> => {
    return AsyncStorage.getItem(key);
  },
  set: async (key: string, value: string): Promise<void> => {
    if (key === 'accessToken') _accessToken = value;
    if (key === 'refreshToken') _refreshToken = value;
    await AsyncStorage.setItem(key, value);
  },
  delete: async (key: string): Promise<void> => {
    if (key === 'accessToken') _accessToken = null;
    if (key === 'refreshToken') _refreshToken = null;
    await AsyncStorage.removeItem(key);
  },
  /** Call once at app start to warm the in-memory token cache from disk. */
  hydrate: async (): Promise<void> => {
    [_accessToken, _refreshToken] = await Promise.all([
      AsyncStorage.getItem('accessToken'),
      AsyncStorage.getItem('refreshToken'),
    ]);
  },
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// ─── Resolve Hostinger vs. local backend, once per app launch ────────────────
// Tries the Hostinger VPS first; if it doesn't answer within
// HOSTINGER_PROBE_TIMEOUT_MS (not deployed yet, unreachable), every request
// just keeps using the local URL that was already the default. Memoized so
// only the very first request pays the probe's latency.
let baseUrlResolution: Promise<string> | null = null;

async function resolvePreferredBaseUrl(): Promise<string> {
  if (Platform.OS === 'web') return API_BASE_URL;

  if (!baseUrlResolution) {
    const hostingerUrl = HOSTINGER_URL;
    baseUrlResolution = (async () => {
      if (!hostingerUrl) return LOCAL_FALLBACK_URL; // probe disabled — see HOSTINGER_URL above

      const probeOnce = async (): Promise<boolean> => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), HOSTINGER_PROBE_TIMEOUT_MS);
          const response = await fetch(`${hostingerUrl}auth/health`, { signal: controller.signal });
          clearTimeout(timer);
          return response.ok;
        } catch {
          return false;
        }
      };

      // One retry, half a second apart, before accepting "Hostinger is down" — a
      // single 502/timeout during a backend cold start or restart otherwise
      // permanently routes this whole app session to the local fallback instead
      // (memoized below). See HOSTINGER_PROBE_TIMEOUT_MS's doc above for the
      // incident this is fixing — the same probe exists in the sibling User App's
      // src/api/axios.ts.
      if (await probeOnce()) return hostingerUrl;
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (await probeOnce()) return hostingerUrl;

      return LOCAL_FALLBACK_URL;
    })();

    baseUrlResolution.then((resolved) => {
      API_BASE_URL = resolved;
      apiClient.defaults.baseURL = resolved;
    });
  }
  return baseUrlResolution;
}

apiClient.interceptors.request.use(async (config) => {
  config.baseURL = await resolvePreferredBaseUrl();
  // A caller-supplied Authorization (the pending-verification upload session,
  // see store/pendingSession.ts) wins over the stored sign-in token.
  if (_accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

/**
 * Firebase ID tokens expire hourly. On a 401, try exactly once to exchange
 * the stored Firebase refresh token for a new ID token (POST /auth/refresh-token),
 * then replay the original request. Concurrent 401s share the same in-flight
 * refresh instead of each firing their own — a stampede of parallel refresh
 * calls would otherwise race and can invalidate each other's tokens.
 */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!_refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ idToken: string; refreshToken: string }>(
        `${API_BASE_URL}auth/refresh-token`,
        { refreshToken: _refreshToken },
      )
      .then(async (res) => {
        await storage.set('accessToken', res.data.idToken);
        await storage.set('refreshToken', res.data.refreshToken);
        return res.data.idToken;
      })
      .catch(async () => {
        await storage.delete('accessToken');
        await storage.delete('refreshToken');
        DeviceEventEmitter.emit(AUTH_LOGOUT_EVENT);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
      await storage.delete('accessToken');
      await storage.delete('refreshToken');
    }
    return Promise.reject(error);
  },
);

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  timestamp: string;
  data: T;
}
