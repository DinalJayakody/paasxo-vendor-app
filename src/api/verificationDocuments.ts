import { apiClient, API_BASE_URL, storage } from './client';
import { ENDPOINTS } from './endpoints';
import { VerificationDocument, VerificationDocType } from '@/types';
import { MEDIA_UPLOAD_TIMEOUT_MS } from './mediaUpload';

/**
 * Business registration / ID uploads. Files are private: there is no public
 * URL — images are fetched from the API with the caller's token (see fileSource).
 * `token` is only passed for a pending provider (store/pendingSession.ts).
 */
function authConfig(token?: string | null) {
  // _retried: a pending session has no refresh token, so a 401 should surface
  // as an error instead of triggering the sign-out refresh flow in client.ts.
  return token ? ({ headers: { Authorization: `Bearer ${token}` }, _retried: true } as any) : {};
}

export const VerificationDocumentsApi = {
  mine: (token?: string | null) => apiClient.get<VerificationDocument[]>(ENDPOINTS.verificationDocuments.mine, authConfig(token)).then((r) => r.data),

  upload: (docType: VerificationDocType, photo: { uri: string; fileName?: string | null }, token?: string | null) => {
    const form = new FormData();
    form.append('docType', docType);
    form.append('file', {
      uri: photo.uri,
      name: photo.fileName || `document-${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as unknown as Blob);
    const cfg = authConfig(token);
    return apiClient
      .post<VerificationDocument>(ENDPOINTS.verificationDocuments.upload, form, { ...cfg, timeout: MEDIA_UPLOAD_TIMEOUT_MS })
      .then((r) => r.data);
  },

  remove: (id: number, token?: string | null) =>
    apiClient.delete(ENDPOINTS.verificationDocuments.one(id), authConfig(token)).then(() => undefined),

  /** Admin only. */
  review: (vendorUid: string, id: number, status: 'APPROVED' | 'REJECTED', note?: string) =>
    apiClient
      .patch<VerificationDocument>(ENDPOINTS.verificationDocuments.review(vendorUid, id), { status, note })
      .then((r) => r.data),

  /** Image source for <Image>, authenticated with the caller's token. */
  fileSource: (id: number, token?: string | null) => {
    const bearer = token ?? storage.getString('accessToken');
    const base = (apiClient.defaults.baseURL ?? API_BASE_URL).replace(/\/+$/, '');
    return {
      uri: `${base}${ENDPOINTS.verificationDocuments.file(id)}`,
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined,
      cache: 'reload' as const, // never keep ID scans in the image cache
    };
  },
};
