import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { PaymentItem, Payout, Subscription, VendorBankAccount, VendorBankAccountPayload } from '@/types';

// Booking accept/reject/list actions live in BookingApi (api/booking.ts) — the
// real, confirmed BookingController endpoints — not here. See BookingApi.
//
// payments/paymentSummary/payouts/bankAccount below read `r.data` directly
// (no `.data.data`) — the backend controllers return the DTO straight from
// ResponseEntity.ok(dto), same convention BookingApi already uses. The old
// `.data.data` here was never actually correct against a real response; it
// was written against an endpoint that didn't exist yet (see endpoints.ts).

export const VendorApi = {
  payments: (page = 0, size = 10) =>
    apiClient.get(ENDPOINTS.vendor.payments, { params: { page, size } })
      .then(r => r.data as { content: PaymentItem[]; totalElements: number }),

  paymentSummary: () =>
    apiClient.get(ENDPOINTS.vendor.paymentSummary)
      .then(r => r.data as { totalRevenue: number; dailyBookingEfficiencyPercent: number; totalTransactions: number }),

  /** The vendor's own Payout ledger — what's due/paid for each settled (48h-before-kickoff) booking. */
  payouts: () =>
    apiClient.get(ENDPOINTS.vendor.payouts).then(r => r.data as Payout[]),

  bankAccount: () =>
    apiClient.get(ENDPOINTS.vendor.bankAccount).then(r => r.data as VendorBankAccount | null).catch(() => null),

  saveBankAccount: (payload: VendorBankAccountPayload) =>
    apiClient.put(ENDPOINTS.vendor.bankAccount, payload).then(r => r.data as VendorBankAccount),

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
