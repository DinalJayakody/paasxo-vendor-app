import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { VendorBooking, VendorBookingPayload } from '@/types';

export const BookingApi = {
  /** GET /bookings/vendor — every non-cancelled booking across all venues the caller owns. */
  vendorBookings: () => apiClient.get<VendorBooking[]>(ENDPOINTS.bookings.vendor).then((r) => r.data),

  /** GET /bookings/{id} — a single booking by id, for the request-detail screen. */
  byId: (bookingId: number) => apiClient.get<VendorBooking>(ENDPOINTS.bookings.byId(bookingId)).then((r) => r.data),

  /** POST /bookings/vendor — book 1+ slots directly for a walk-in/phone customer.
   *  Goes through the same slot-claiming + pricing logic as a real customer booking. */
  vendorBook: (payload: VendorBookingPayload) =>
    apiClient.post<VendorBooking>(ENDPOINTS.bookings.vendor, payload).then((r) => r.data),

  /** PATCH /bookings/{id}/cancel-as-vendor — releases the slot(s) back to AVAILABLE. */
  cancelAsVendor: (bookingId: number) =>
    apiClient.patch<VendorBooking>(ENDPOINTS.bookings.cancelAsVendor(bookingId)).then((r) => r.data),

  /** PATCH /bookings/{id}/accept-as-vendor — booking goes live (ACTIVE_MATCH), slot(s) -> BOOKED. */
  acceptBooking: (bookingId: number) =>
    apiClient.patch<VendorBooking>(ENDPOINTS.bookings.acceptAsVendor(bookingId)).then((r) => r.data),

  /** PATCH /bookings/{id}/reject-as-vendor — booking -> CANCELLED, slot(s) -> AVAILABLE. */
  rejectBooking: (bookingId: number, reason?: string) =>
    apiClient
      .patch<VendorBooking>(ENDPOINTS.bookings.rejectAsVendor(bookingId), reason ? { reason } : undefined)
      .then((r) => r.data),
};
