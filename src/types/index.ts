/** Mirrors mobile-app-paasxo's FutsalResponse exactly — the real, only venue shape this backend has. */
export interface Venue {
  id: number;
  name: string;
  location: string;
  description?: string;
  imageUrl?: string;
  imageBase64?: string; // raw base64, no data: prefix — build a data URI to render it
  pricePerSlot: number;
  openTime: string; // "HH:mm:ss"
  closeTime: string; // "HH:mm:ss"
  slotDurationMinutes: number;
  active: boolean;
  latitude?: number;
  longitude?: number;
}

export type SlotStatus = 'AVAILABLE' | 'PENDING_VENDOR' | 'BOOKED' | 'BLOCKED';

/** Mirrors mobile-app-paasxo's TimeSlotResponse exactly. */
export interface TimeSlot {
  id: number;
  futsalId: number;
  slotDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm:ss"
  endTime: string; // "HH:mm:ss"
  available: boolean;
  status: SlotStatus;
  blockedReason?: string;
  // Set when status === 'BOOKED' or 'PENDING_VENDOR' — the real Booking behind this slot.
  bookingId?: number;
  walkIn?: boolean;
}

export interface ClosedDateItem {
  id: number;
  date: string; // "YYYY-MM-DD"
  reason?: string;
}

export interface CloseDateSummary {
  date: string;
  reason?: string;
  blockedCount: number;
  skippedBookedCount: number;
}

export interface BulkSlotActionResult {
  blockedCount: number;
  skippedCount: number;
}

/** Payload sent to POST /bookings/vendor — vendor books 1+ slots for a walk-in/phone customer. */
export interface VendorBookingPayload {
  futsalId: number;
  slotIds: number[];
  title?: string;
  description?: string;
  sport?: string;
}

/** Mirrors mobile-app-paasxo's BookingResponse, trimmed to what the vendor UI needs. */
export interface VendorBooking {
  id: number;
  userId: string;
  futsalId: number;
  futsalName: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  title?: string;
  sport?: string;
  totalPrice?: number;
  // PENDING_VENDOR: awaiting this vendor's accept/reject decision.
  // ACTIVE_MATCH: accepted (or a vendor walk-in) — live, joinable, public.
  // CANCELLED: rejected by the vendor, or cancelled by the organizer/vendor.
  status: 'PENDING_VENDOR' | 'ACTIVE_MATCH' | 'CANCELLED';
  bookedAt: string;
  walkIn?: boolean;
  // Set only when status === 'CANCELLED' via a vendor rejection.
  rejectionReason?: string;
  maxSpots?: number;
  slotCount?: number;
  // Organizer is always players[0] — enriched with a display name server-side.
  players?: { firebaseUid: string; displayName: string; profileImageUrl?: string }[];
}

/** Mirrors mobile-app-paasxo's NotificationResponse exactly — same shared in-app
 *  notification feed the User App reads, from the vendor's own Firebase UID. */
export interface VendorNotification {
  id: string;
  type: 'BOOKING_PENDING_VENDOR_APPROVAL' | string;
  bookingId?: number;
  title: string;
  body: string;
  matchSnapshot?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface PaymentItem {
  id: number;
  customerName: string;
  sport: string;
  dateRange: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}

export interface Subscription {
  id: number;
  planType: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  monthlyPrice: number;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  currentPeriodEnd: string;
}

/** Mirrors mobile-app-paasxo's UserDto exactly. */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  accountType: 'USER' | 'VENDOR';
  sports?: string[];
}

/** Payload sent to POST /auth/register. Vendor app always pins accountType to 'VENDOR'. */
export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
  accountType: 'VENDOR';
  sports?: string[];
}

export type SportType = 'Futsal' | 'Cricket' | 'Pickleball' | 'Paddleball';

/**
 * Payload sent to POST /futsals. This mirrors the backend's FutsalRequest DTO
 * exactly — it has no sport-tagging field, so the Create Venue screen's sport
 * selector is UI-only for now (every resource created here is a "Futsal" row
 * regardless of which sport card was picked, until the backend adds one).
 */
export interface CreateVenuePayload {
  name: string;
  location: string; // main city, derived from the map picker's reverse-geocode
  description?: string;
  latitude: number;
  longitude: number;
  pricePerSlot: number;
  openTime: string; // "HH:mm:ss"
  closeTime: string; // "HH:mm:ss"
  slotDurationMinutes: number;
}
