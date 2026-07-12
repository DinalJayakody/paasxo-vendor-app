import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { VendorNotification } from '@/types';

/** Same in-app notification feed (GET /notifications) the User App reads — the backend
 *  resolves the recipient from the authenticated caller's Firebase UID, so a vendor
 *  account transparently gets its own notifications (new requests, etc.) through it. */
export const NotificationApi = {
  all: () => apiClient.get<VendorNotification[]>(ENDPOINTS.notifications.all).then((r) => r.data),

  unreadCount: () =>
    apiClient
      .get<{ count: number }>(ENDPOINTS.notifications.unreadCount)
      .then((r) => r.data?.count ?? 0),

  markRead: (id: string) =>
    apiClient.post<VendorNotification>(ENDPOINTS.notifications.markRead(id)).then((r) => r.data),

  markAllRead: () => apiClient.post<void>(ENDPOINTS.notifications.markAllRead),
};
