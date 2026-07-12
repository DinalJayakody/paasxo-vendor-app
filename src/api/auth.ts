import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { RegisterPayload } from '@/types';

export interface UserDtoData {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  profileImageUrl: string | null;
  authProvider: string | null;
  emailVerified: boolean | null;
  accountType: 'USER' | 'VENDOR';
  sports: string[] | null;
  skillLevel: string | null;
  locationAccess: boolean | null;
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
};
