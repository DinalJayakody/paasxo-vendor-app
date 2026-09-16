import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { RegisterPayload } from '@/types';

// Same Firebase project as the sibling User App (paasxo-a3769) — a Web API
// key is not a secret (it only identifies the Firebase project to Google's
// endpoints; access is still governed by Firebase Auth/rules), so it's safe
// to ship in the client the same way the User App already does.
const FIREBASE_WEB_API_KEY = 'AIzaSyBPw64jTzdD2SYrUje39tC5TGp8qiwzRhI';

export interface UserDtoData {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  profileImageUrl: string | null;
  authProvider: string | null;
  emailVerified: boolean | null;
  accountType: 'USER' | 'VENDOR' | 'TRAINER' | 'ADMIN';
  sports: string[] | null;
  skillLevel: string | null;
  locationAccess: boolean | null;
  // false only for a VENDOR pending manual verification — see authStore.register().
  active?: boolean | null;
}

export interface AuthResponseData {
  idToken: string; // real Firebase ID token — used as the bearer token everywhere
  refreshToken: string; // real Firebase refresh token
  user: UserDtoData;
  message: string;
}

function guessMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'heic': return 'image/heic';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}

/**
 * The backend binds the "request" part with @RequestPart(...) SomeDto, which
 * only auto-deserializes as JSON if the part itself carries
 * Content-Type: application/json. A plain formData.append(key, jsonString)
 * sends it as text/plain and Spring can't bind it — so we fake the part as a
 * "file" via a data: URI, which lets RN's FormData set an explicit MIME type.
 */
function jsonPart(payload: unknown) {
  const json = JSON.stringify(payload);
  return {
    uri: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    name: 'request.json',
    type: 'application/json',
  } as unknown as Blob;
}

export const AuthApi = {
  register: (payload: RegisterPayload, profileImageUri?: string) => {
    const formData = new FormData();
    formData.append('request', jsonPart(payload));
    if (profileImageUri) {
      const name = profileImageUri.split('/').pop() ?? `profile-${Date.now()}.jpg`;
      formData.append('profileImage', {
        uri: profileImageUri,
        name,
        type: guessMimeType(profileImageUri),
      } as unknown as Blob);
    }
    return apiClient
      .post<AuthResponseData>(ENDPOINTS.auth.register, formData)
      .then((r) => r.data);
  },

  login: (email: string, password: string) =>
    apiClient
      .post<AuthResponseData>(ENDPOINTS.auth.login, { email, password })
      .then((r) => r.data),

  /** Exchange a real Google/Firebase ID token (from native sign-in) for a backend session. */
  loginWithGoogle: (idToken: string) =>
    apiClient
      .post<AuthResponseData>(ENDPOINTS.auth.loginGoogle, { idToken })
      .then((r) => r.data),

  refreshToken: (refreshToken: string) =>
    apiClient
      .post<AuthResponseData>(ENDPOINTS.auth.refreshToken, { refreshToken })
      .then((r) => r.data),

  /** Permanently deletes the signed-in user's account — App Store Guideline 5.1.1(v). */
  deleteAccount: () => apiClient.delete(ENDPOINTS.auth.deleteAccount).then((r) => r.data),

  /**
   * Firebase's own password-reset email, called directly against the Identity
   * Toolkit REST API (no SDK needed) — same Firebase project (paasxo-a3769)
   * the backend proxies auth through. Independent of the backend being up.
   */
  sendPasswordReset: (email: string) =>
    fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
      },
    ).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Could not send reset email');
      }
    }),
};
