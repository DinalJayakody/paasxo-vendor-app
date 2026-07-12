import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { PaymentItem, Subscription } from '@/types';

// Booking accept/reject/list actions live in BookingApi (api/booking.ts) — the
// real, confirmed BookingController endpoints — not here. See BookingApi.

export const VendorApi = {
  payments: (page = 0, size = 10) =>
    apiClient.get(ENDPOINTS.vendor.payments, { params: { page, size } })
      .then(r => r.data.data as { content: PaymentItem[]; totalElements: number }),

  paymentSummary: () =>
    apiClient.get(ENDPOINTS.vendor.paymentSummary)
      .then(r => r.data.data as { totalRevenue: number; dailyBookingEfficiencyPercent: number; totalTransactions: number }),

  currentSubscription: () =>
    apiClient.get<{ data: Subscription }>(ENDPOINTS.vendor.subscription).then(r => r.data.data).catch(() => null),

  checkoutSubscription: (payload: { planType: string; paymentMethod: string; cardholderName?: string }) =>
    apiClient.post<{ data: Subscription }>(ENDPOINTS.vendor.subscriptionCheckout, payload).then(r => r.data.data),

  // Do not set a manual multipart Content-Type header on a FormData body — it
  // strips the boundary React Native auto-generates and the server receives
  // an unparsable request. See auth.ts register() for the same fix.
  uploadFile: (category: string, formData: FormData) =>
    apiClient.post(ENDPOINTS.uploads(category), formData).then(r => r.data.data as { url: string }),
};
