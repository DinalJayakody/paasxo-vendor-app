import { create } from 'zustand';

/**
 * A provider still awaiting approval can't sign in to the vendor app, but may
 * upload verification documents while they wait. The Firebase ID token from
 * their registration / sign-in attempt is kept here, in memory only — never
 * persisted, gone when the app closes, and expires within the hour anyway.
 */
interface PendingSessionState {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const usePendingSession = create<PendingSessionState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}));
