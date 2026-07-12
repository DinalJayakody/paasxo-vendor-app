import { create } from 'zustand';
import { storage } from '@/api/client';
import { AuthApi, AuthResponseData } from '@/api/auth';
import { AuthUser, RegisterPayload } from '@/types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  register: (payload: Omit<RegisterPayload, 'accountType'>, profileImageUri?: string) => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
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

  register: async (payload, profileImageUri) => {
    const data = await AuthApi.register({ ...payload, accountType: 'VENDOR' }, profileImageUri);
    const user = await persistSession(data);
    set({ user, isAuthenticated: true });
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
    await storage.delete('accessToken');
    await storage.delete('refreshToken');
    await storage.delete('authUser');
    set({ user: null, isAuthenticated: false });
  },
}));
