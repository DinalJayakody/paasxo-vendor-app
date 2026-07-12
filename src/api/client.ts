import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Single backend for both the User App and Vendor App: mobile-app-paasxo.
// It authenticates via real Firebase ID tokens (not a custom-issued JWT) —
// idToken/refreshToken below are literally Firebase's, proxied through this
// Spring Boot service. See authStore.ts / api/auth.ts for the full flow.
// iOS Simulator  → http://localhost:8080/api/  (works as-is)
// Android Emulator → replace localhost with 10.0.2.2
// Physical device  → replace localhost with your machine's LAN IP (run: ipconfig getifaddr en0)
export const API_BASE_URL = 'http://localhost:8080/api/';

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

apiClient.interceptors.request.use((config) => {
  if (_accessToken) {
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
