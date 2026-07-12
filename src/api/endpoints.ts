/**
 * Single source of truth for every backend path this app calls.
 * apiClient (client.ts) owns the base URL + auth header; this file owns paths;
 * auth.ts / vendor.ts / futsal.ts own the actual call methods.
 *
 * Everything below targets the single mobile-app-paasxo backend (port 8080).
 */
export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    loginGoogle: '/auth/login-google',
    refreshToken: '/auth/refresh-token',
    profile: '/auth/profile',
  },
  // NOTE: unverified against mobile-app-paasxo — no SubscriptionController route
  // was found for these when the real backend was audited (see futsals/bookings
  // below for the confirmed ones). Left as-is: out of scope for this change, not
  // newly broken by it. Booking accept/reject/list live under `bookings` below —
  // those ARE confirmed against the real BookingController.
  vendor: {
    payments: '/vendor/payments',
    paymentSummary: '/vendor/payments/summary',
    subscription: '/vendor/subscription',
    subscriptionCheckout: '/vendor/subscription/checkout',
  },
  uploads: (category: string) => `/uploads/${category}`,
  // Confirmed against the real FutsalController in mobile-app-paasxo.
  futsals: {
    create: '/futsals',
    mine: '/futsals/mine',
    byId: (id: number) => `/futsals/${id}`,
    update: (id: number) => `/futsals/${id}`,
    slots: (futsalId: number) => `/futsals/${futsalId}/slots`,
    availableSlots: (futsalId: number) => `/futsals/${futsalId}/slots/available`,
    generateSlots: (futsalId: number) => `/futsals/${futsalId}/slots/generate`,
    slotStatus: (futsalId: number, slotId: number) => `/futsals/${futsalId}/slots/${slotId}`,
    blockSlotsBulk: (futsalId: number) => `/futsals/${futsalId}/slots/block-bulk`,
    closedDates: (futsalId: number) => `/futsals/${futsalId}/closed-dates`,
    closedDate: (futsalId: number, date: string) => `/futsals/${futsalId}/closed-dates/${date}`,
  },
  // Confirmed against the real BookingController in mobile-app-paasxo.
  bookings: {
    vendor: '/bookings/vendor',
    byId: (bookingId: number) => `/bookings/${bookingId}`,
    cancelAsVendor: (bookingId: number) => `/bookings/${bookingId}/cancel-as-vendor`,
    acceptAsVendor: (bookingId: number) => `/bookings/${bookingId}/accept-as-vendor`,
    rejectAsVendor: (bookingId: number) => `/bookings/${bookingId}/reject-as-vendor`,
  },
  // Confirmed against the real NotificationController in mobile-app-paasxo — same
  // in-app notification feed the User App already reads, just from the vendor's uid.
  notifications: {
    all: '/notifications',
    unreadCount: '/notifications/unread-count',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
  },
} as const;
