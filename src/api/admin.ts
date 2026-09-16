import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { AdminVendorDetail, AdminVendorSummary, AdminVenueFinancials, Venue } from '@/types';

// No separate admin login here — the info@paasxo.com admin is a real
// Firebase-backed account (see backend's AdminAccountSeeder) and signs in
// through the exact same LoginScreen/AuthApi.login()/authStore.loginWithEmailPassword()
// every vendor/trainer/user uses. This file only covers the admin-only
// vendor-management endpoints below.
export const AdminVendorApi = {
  list: () => apiClient.get<AdminVendorSummary[]>(ENDPOINTS.admin.vendors).then((r) => r.data),

  detail: (firebaseUid: string) =>
    apiClient.get<AdminVendorDetail>(ENDPOINTS.admin.vendorDetail(firebaseUid)).then((r) => r.data),

  setStatus: (firebaseUid: string, active: boolean) =>
    apiClient
      .patch<AdminVendorSummary>(ENDPOINTS.admin.vendorStatus(firebaseUid), { active })
      .then((r) => r.data),

  /** commissionRate is a fraction (0.05 = 5%), matching the backend exactly —
   *  pass null to reset the venue back to the platform default rate. */
  setVenueCommissionRate: (firebaseUid: string, futsalId: number, commissionRate: number | null) =>
    apiClient
      .patch<AdminVenueFinancials>(ENDPOINTS.admin.venueCommissionRate(firebaseUid, futsalId), { commissionRate })
      .then((r) => r.data),

  /** Admin's equivalent of the vendor's own Active/Inactive toggle for one venue. */
  setVenueActive: (firebaseUid: string, futsalId: number, active: boolean) =>
    apiClient
      .patch<Venue>(ENDPOINTS.admin.venueStatus(firebaseUid, futsalId), { active })
      .then((r) => r.data),

  /** Confirms a manual bank transfer was made (DUE -> PAID) — returns the refreshed vendor detail. */
  markPayoutPaid: (firebaseUid: string, payoutId: number, reference?: string) =>
    apiClient
      .post<AdminVendorDetail>(ENDPOINTS.admin.markPayoutPaid(firebaseUid, payoutId), { reference })
      .then((r) => r.data),
};
