import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { BusinessRegistration, CreateBusinessRegistrationPayload } from '@/types';

function guessMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'heic': return 'image/heic';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}

export const BusinessRegistrationApi = {
  /** Same multipart-JSON-as-fake-file trick as FutsalApi.create — see futsal.ts. */
  create: (payload: CreateBusinessRegistrationPayload, documentUri?: string) => {
    const formData = new FormData();
    const requestJson = JSON.stringify(payload);
    formData.append('request', {
      uri: `data:application/json;charset=utf-8,${encodeURIComponent(requestJson)}`,
      name: 'request.json',
      type: 'application/json',
    } as unknown as Blob);
    if (documentUri) {
      const name = documentUri.split('/').pop() ?? `br-document-${Date.now()}.jpg`;
      formData.append('document', {
        uri: documentUri,
        name,
        type: guessMimeType(documentUri),
      } as unknown as Blob);
    }
    return apiClient
      .post<BusinessRegistration>(ENDPOINTS.businessRegistrations.create, formData)
      .then((r) => r.data);
  },

  mine: () => apiClient.get<BusinessRegistration[]>(ENDPOINTS.businessRegistrations.mine).then((r) => r.data),
};
