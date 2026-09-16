/** Mirrors mobile-app-paasxo's FutsalResponse exactly — the real, only venue shape this backend has. */
export interface Venue {
  id: number;
  name: string;
  location: string;
  description?: string;
  imageUrl?: string; // Cloudflare R2 URL — the only shape new venues have
  imageBase64?: string; // legacy fallback for venues created before the R2 cutover
  sports?: BackendSport[];
  businessRegistrationId?: number;
  pricePerSlot: number;
  openTime: string; // "HH:mm:ss"
  closeTime: string; // "HH:mm:ss"
  slotDurationMinutes: number;
  active: boolean;
  latitude?: number;
  longitude?: number;
}

/** Mirrors mobile-app-paasxo's BusinessRegistrationResponse. */
export interface BusinessRegistration {
  id: number;
  registrationNumber: string;
  businessName: string;
  documentUrl?: string; // Cloudflare R2 URL
  // Set only in the response right after create() when a document was attached
  // but couldn't be processed (too large / unreadable format) — the registration
  // itself still saved fine, this just says the photo didn't come along.
  documentSkippedReason?: string;
  createdAt: string;
}

export interface CreateBusinessRegistrationPayload {
  registrationNumber: string;
  businessName: string;
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

/** One settled booking's owed-to-vendor amount — mirrors backend PayoutResponse.
 *  DUE = owed but not yet paid; PAID = admin confirmed the bank transfer was made
 *  (manually, outside the app — see the Payouts screen's guide copy); VOIDED = the
 *  booking was cancelled after settlement but before payout, so nothing is owed. */
export interface Payout {
  id: number;
  bookingId: number;
  bookingTitle: string | null;
  futsalName: string | null;
  slotDate: string | null;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netPayoutAmount: number;
  status: 'DUE' | 'PAID' | 'VOIDED';
  dueAt: string;
  paidAt: string | null;
  paidReference: string | null;
}

/** accountNumberMasked only ever shows the last 4 digits — see VendorBankAccountController. */
export interface VendorBankAccount {
  id: number;
  bankName: string;
  branchName: string;
  accountHolderName: string;
  accountNumberMasked: string;
  updatedAt: string;
}

export interface VendorBankAccountPayload {
  bankName: string;
  branchName: string;
  accountHolderName: string;
  accountNumber: string;
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
  accountType: 'USER' | 'VENDOR' | 'TRAINER' | 'ADMIN';
  sports?: string[];
  // false only for a VENDOR pending manual verification (see AuthService#assertVendorActive) —
  // always true for USER/TRAINER/ADMIN.
  active?: boolean;
}

/** Mirrors mobile-app-paasxo's AdminVendorSummaryResponse — one row of the admin vendor list. */
export interface AdminVendorSummary {
  firebaseUid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  active: boolean;
  createdAt: string;
  venueCount: number;
  bookingCount: number;
  totalDue: number;
}

/** Mirrors mobile-app-paasxo's AdminVenueFinancialsResponse — one venue's revenue/commission/due/paid summary. */
export interface AdminVenueFinancials {
  futsalId: number;
  futsalName: string;
  // Null = no venue-specific override set; falls back to effectiveCommissionRate.
  commissionRate: number | null;
  effectiveCommissionRate: number;
  bookingCount: number;
  totalRevenue: number;
  totalCommissionEarned: number;
  totalDue: number;
  totalPaid: number;
}

/** Mirrors mobile-app-paasxo's AdminVendorDetailResponse — full vendor detail for the admin console. */
export interface AdminVendorDetail {
  firebaseUid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  active: boolean;
  createdAt: string;
  sports?: string[];
  businessRegistrations: BusinessRegistration[];
  venues: Venue[];
  bookings: VendorBooking[];
  payments: PaymentItem[];
  payouts: Payout[];
  venueFinancials: AdminVenueFinancials[];
  totalRevenue: number;
  totalCommissionEarned: number;
  totalDue: number;
  totalPaid: number;
}

/** Payload sent to POST /auth/register. This app registers either Vendor or Trainer accounts. */
export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
  accountType: 'VENDOR' | 'TRAINER';
  sports?: string[];
}

// ─── Trainer domain — mirrors mobile-app-paasxo's dto.trainer.* responses exactly ──────

export type TrainerCategory =
  | 'GYM' | 'CALISTHENICS' | 'DANCING' | 'YOGA' | 'CROSSFIT' | 'MARTIAL_ARTS' | 'PILATES' | 'OTHER';

export interface TrainerProfile {
  id: number;
  trainerFirebaseUid: string;
  trainerDisplayName?: string;
  trainerAvatarUrl?: string;
  categories: TrainerCategory[];
  bio?: string;
  certifications?: string;
  experienceYears?: number;
  hourlyRate?: number;
  profileImageUrl?: string;
  coverImageUrl?: string;
  galleryImageUrls?: string[];
  location?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  active: boolean;
  sessionCount?: number;
}

export interface UpsertTrainerProfilePayload {
  categories: TrainerCategory[];
  bio?: string;
  certifications?: string;
  experienceYears?: number;
  hourlyRate?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export type DayOfWeekName =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface TrainerSession {
  id: number;
  trainerFirebaseUid: string;
  trainerDisplayName?: string;
  trainerAvatarUrl?: string;
  title: string;
  category: TrainerCategory;
  description?: string;
  location?: string;
  isOnline: boolean;
  latitude?: number;
  longitude?: number;
  price: number;
  durationMinutes: number;
  capacity: number;
  daysOfWeek: DayOfWeekName[];
  startTime: string; // "HH:mm:ss"
  planDetails?: string;
  imageUrl?: string;
  active: boolean;
}

export interface CreateSessionPayload {
  title: string;
  category: TrainerCategory;
  description?: string;
  location?: string;
  isOnline?: boolean;
  latitude?: number;
  longitude?: number;
  price: number;
  durationMinutes: number;
  capacity: number;
  daysOfWeek: DayOfWeekName[];
  startTime: string; // "HH:mm:ss"
  planDetails?: string;
}

export type TrainerSessionSlotStatus = 'OPEN' | 'FULL' | 'CANCELLED';

export interface TrainerSessionSlot {
  id: number;
  trainerSessionId: number;
  slotDate: string; // "YYYY-MM-DD"
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  spotsLeft: number;
  status: TrainerSessionSlotStatus;
}

export type TrainerBookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface TrainerBooking {
  id: number;
  userId: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
  slotId: number;
  sessionId: number;
  sessionTitle: string;
  trainerFirebaseUid: string;
  trainerDisplayName?: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  status: TrainerBookingStatus;
  pricePaid?: number;
  bookedAt: string;
}

export type SportType = 'Futsal' | 'Cricket' | 'Pickleball' | 'Paddleball';

/** Mirrors the backend's Sport enum (com.pasxo.dto.enums.Sport) — uppercase values. */
export type BackendSport = 'FUTSAL' | 'CRICKET' | 'PICKLEBALL' | 'PADDLEBALL';

/** Payload sent to POST /futsals. Mirrors the backend's FutsalRequest DTO. */
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
  /** At least one required — a venue can support more than one sport. */
  sports: BackendSport[];
  /** Optional — id of an existing BusinessRegistration (see businessRegistration.ts). */
  businessRegistrationId?: number;
}
