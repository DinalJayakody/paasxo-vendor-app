import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { BulkSlotActionResult, CloseDateSummary, ClosedDateItem, CreateVenuePayload, SlotStatus, TimeSlot, Venue } from '@/types';

function guessMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'heic': return 'image/heic';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}

export const FutsalApi = {
  /**
   * POST /futsals (mobile-app-paasxo backend). Unlike /auth/register, this
   * controller binds the "request" part with @RequestPart(...) FutsalRequest,
   * which requires Spring to run its Jackson message converter on that part —
   * that only happens if the part's own Content-Type is application/json. A
   * plain formData.append('request', jsonString) sends it as text/plain and
   * Spring can't bind it. The fix RN developers use for this exact situation:
   * fake a "file" part via a data: URI so we can set an explicit MIME type.
   *
   * Also note: this backend returns the resource directly (ResponseEntity<T>),
   * not wrapped in the {success,message,data} envelope paasxo-platform uses.
   */
  create: (payload: CreateVenuePayload, imageUri?: string) => {
    const formData = new FormData();
    const requestJson = JSON.stringify(payload);
    formData.append('request', {
      uri: `data:application/json;charset=utf-8,${encodeURIComponent(requestJson)}`,
      name: 'request.json',
      type: 'application/json',
    } as unknown as Blob);
    if (imageUri) {
      const name = imageUri.split('/').pop() ?? `venue-${Date.now()}.jpg`;
      formData.append('image', {
        uri: imageUri,
        name,
        type: guessMimeType(imageUri),
      } as unknown as Blob);
    }
    return apiClient
      .post<unknown>(ENDPOINTS.futsals.create, formData)
      .then((r) => r.data);
  },

  /** Same multipart-JSON-as-fake-file trick as create() — see comment above. PUT /futsals/{id}. */
  update: (id: number, payload: CreateVenuePayload, imageUri?: string) => {
    const formData = new FormData();
    const requestJson = JSON.stringify(payload);
    formData.append('request', {
      uri: `data:application/json;charset=utf-8,${encodeURIComponent(requestJson)}`,
      name: 'request.json',
      type: 'application/json',
    } as unknown as Blob);
    if (imageUri) {
      const name = imageUri.split('/').pop() ?? `venue-${Date.now()}.jpg`;
      formData.append('image', {
        uri: imageUri,
        name,
        type: guessMimeType(imageUri),
      } as unknown as Blob);
    }
    return apiClient
      .put<Venue>(ENDPOINTS.futsals.update(id), formData)
      .then((r) => r.data);
  },

  /** Active/Inactive toggle for one of the vendor's own venues — plain JSON PATCH,
   *  no multipart trick needed since there's no file part involved (see create/update above). */
  setActive: (id: number, active: boolean) =>
    apiClient.patch<Venue>(ENDPOINTS.futsals.status(id), { active }).then((r) => r.data),

  // Every venue this vendor owns, active AND inactive — a deactivated venue
  // must stay visible here so it can be switched back on (see backend
  // FutsalService#getMine's comment for why this isn't active-only).
  getMine: () => apiClient.get<Venue[]>(ENDPOINTS.futsals.mine).then((r) => r.data),

  getById: (id: number) => apiClient.get<Venue>(ENDPOINTS.futsals.byId(id)).then((r) => r.data),

  slotsForDate: (futsalId: number, date: string) =>
    apiClient.get<TimeSlot[]>(ENDPOINTS.futsals.slots(futsalId), { params: { date } }).then((r) => r.data),

  generateSlots: (futsalId: number, date: string) =>
    apiClient.post<TimeSlot[]>(ENDPOINTS.futsals.generateSlots(futsalId), null, { params: { date } }).then((r) => r.data),

  /** AVAILABLE <-> BLOCKED only — booking a slot always goes through BookingApi.vendorBook. */
  setSlotStatus: (futsalId: number, slotId: number, status: Exclude<SlotStatus, 'BOOKED'>, reason?: string) =>
    apiClient
      .patch<TimeSlot>(ENDPOINTS.futsals.slotStatus(futsalId, slotId), { status, reason })
      .then((r) => r.data),

  /** Block an arbitrary set of slots at once (e.g. a vendor-picked time range) — already-booked slots are skipped. */
  blockSlots: (futsalId: number, slotIds: number[], reason?: string) =>
    apiClient
      .post<BulkSlotActionResult>(ENDPOINTS.futsals.blockSlotsBulk(futsalId), { slotIds, reason })
      .then((r) => r.data),

  closeDate: (futsalId: number, date: string, reason?: string) =>
    apiClient
      .post<CloseDateSummary>(ENDPOINTS.futsals.closedDates(futsalId), { date, reason })
      .then((r) => r.data),

  openDate: (futsalId: number, date: string) =>
    apiClient.delete(ENDPOINTS.futsals.closedDate(futsalId, date)),

  getClosedDates: (futsalId: number) =>
    apiClient.get<ClosedDateItem[]>(ENDPOINTS.futsals.closedDates(futsalId)).then((r) => r.data),
};
