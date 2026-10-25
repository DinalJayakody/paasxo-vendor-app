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
    // Required by App Store Review Guideline 5.1.1(v) — confirmed against the
    // real AuthController#deleteAccount, shared with the User App.
    deleteAccount: '/auth/account',
  },
  // Confirmed against the real AdminVendorController in mobile-app-paasxo —
  // the info@paasxo.com vendor-management console. No separate admin login
  // endpoint: that account is a real Firebase user (see AdminAccountSeeder)
  // and signs in through the normal auth.login above.
  admin: {
    vendors: '/admin/vendors',
    vendorDetail: (firebaseUid: string) => `/admin/vendors/${firebaseUid}`,
    vendorStatus: (firebaseUid: string) => `/admin/vendors/${firebaseUid}/status`,
    venueCommissionRate: (firebaseUid: string, futsalId: number) =>
      `/admin/vendors/${firebaseUid}/venues/${futsalId}/commission-rate`,
    venueStatus: (firebaseUid: string, futsalId: number) =>
      `/admin/vendors/${firebaseUid}/venues/${futsalId}/status`,
    markPayoutPaid: (firebaseUid: string, payoutId: number) =>
      `/admin/vendors/${firebaseUid}/payouts/${payoutId}/mark-paid`,
  },
  // payments/paymentSummary/payouts ARE confirmed — backed by the new
  // VendorPaymentController. subscription* are NOT — no SubscriptionController
  // route was found for these when the real backend was audited. Left as-is:
  // out of scope for this change, not newly broken by it. Booking accept/
  // reject/list live under `bookings` below — those ARE confirmed too.
  vendor: {
    payments: '/vendor/payments',
    paymentSummary: '/vendor/payments/summary',
    payouts: '/vendor/payments/payouts',
    bankAccount: '/vendor/bank-account',
    subscription: '/vendor/subscription',
    subscriptionCheckout: '/vendor/subscription/checkout',
  },
  uploads: (category: string) => `/uploads/${category}`,
  verificationDocuments: {
    upload: '/verification-documents',
    mine: '/verification-documents/mine',
    one: (id: number) => `/verification-documents/${id}`,
    file: (id: number) => `/verification-documents/${id}/file`,
    review: (vendorUid: string, id: number) => `/admin/vendors/${encodeURIComponent(vendorUid)}/documents/${id}`,
  },
  businessRegistrations: {
    create: '/vendor/business-registrations',
    mine: '/vendor/business-registrations/my',
  },
  // Confirmed against the real FutsalController in mobile-app-paasxo.
  futsals: {
    create: '/futsals',
    mine: '/futsals/mine',
    byId: (id: number) => `/futsals/${id}`,
    update: (id: number) => `/futsals/${id}`,
    status: (id: number) => `/futsals/${id}/status`,
    slots: (futsalId: number) => `/futsals/${futsalId}/slots`,
    availableSlots: (futsalId: number) => `/futsals/${futsalId}/slots/available`,
    generateSlots: (futsalId: number) => `/futsals/${futsalId}/slots/generate`,
    slotStatus: (futsalId: number, slotId: number) => `/futsals/${futsalId}/slots/${slotId}`,
    blockSlotsBulk: (futsalId: number) => `/futsals/${futsalId}/slots/block-bulk`,
    closedDates: (futsalId: number) => `/futsals/${futsalId}/closed-dates`,
    closedDate: (futsalId: number, date: string) => `/futsals/${futsalId}/closed-dates/${date}`,
    specialities: (id: number) => `/futsals/${id}/specialities`,
    media: (id: number) => `/futsals/${id}/media`,
    promotion: (id: number) => `/futsals/${id}/promotion`,
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
    pushToken: '/notifications/push-token',
  },
  // Confirmed against TrainerProfileController / TrainerSessionController / TrainerBookingController.
  trainers: {
    filter: '/trainers',
    byId: (id: number) => `/trainers/${id}`,
    me: '/trainers/me',
    sessionsCreate: '/trainers/sessions',
    sessionUpdate: (id: number) => `/trainers/sessions/${id}`,
    sessionsMine: '/trainers/sessions/mine',
    sessionsForTrainer: (trainerFirebaseUid: string) => `/trainers/${trainerFirebaseUid}/sessions`,
    sessionById: (id: number) => `/trainers/sessions/${id}`,
    generateSlots: (sessionId: number) => `/trainers/sessions/${sessionId}/slots/generate`,
    slots: (sessionId: number) => `/trainers/sessions/${sessionId}/slots`,
    cancelSlot: (sessionId: number, slotId: number) => `/trainers/sessions/${sessionId}/slots/${slotId}/cancel`,
    reopenSlot: (sessionId: number, slotId: number) => `/trainers/sessions/${sessionId}/slots/${slotId}/reopen`,
    mySpecialities: '/trainers/me/specialities',
    sessionPromotion: (id: number) => `/trainers/sessions/${id}/promotion`,
    plans: '/trainers/plans',
    plansMine: '/trainers/plans/mine',
    planSales: '/trainers/plans/sales',
    planCustomers: '/trainers/plans/customers',
    planAssign: (id: number) => `/trainers/plans/${id}/assign`,
    planPersonal: (purchaseId: number) => `/trainers/plans/purchases/${purchaseId}/personal`,
    plan: (id: number) => `/trainers/plans/${id}`,
    planActive: (id: number) => `/trainers/plans/${id}/active`,
    myMedia: '/trainers/me/media',
    roster: (sessionId: number) => `/trainers/sessions/${sessionId}/roster`,
    // Every upcoming date across every session this trainer owns — backs the
    // "All Dates" screen's cross-session search (by exact date and/or session name).
    allUpcomingSlots: '/trainers/sessions/slots',
  },
} as const;
