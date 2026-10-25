import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { MEDIA_UPLOAD_TIMEOUT_MS, PickedMedia, mediaFilePart } from './mediaUpload';
import {
  CreateSessionPayload, Promotion, TrainerBooking, TrainerPlan, TrainerPlanPayload, TrainerPlanSale, TrainerCustomer,
  TrainerProfile, TrainerSession, TrainerSessionSlot,
  TrainerSlotOverview, UpsertTrainerProfilePayload,
} from '@/types';

function guessMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'heic': return 'image/heic';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}

/**
 * Same multipart-JSON-as-fake-file trick used by futsal.ts/auth.ts — the backend
 * binds the "request" part with @RequestPart(...) SomeDto, which only auto-
 * deserializes as JSON if the part itself carries Content-Type: application/json.
 * A plain formData.append(key, jsonString) sends text/plain and Spring can't bind it.
 */
function jsonPart(payload: unknown) {
  const json = JSON.stringify(payload);
  return {
    uri: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    name: 'request.json',
    type: 'application/json',
  } as unknown as Blob;
}

function filePart(uri: string, fallbackName: string) {
  const name = uri.split('/').pop() ?? fallbackName;
  return { uri, name, type: guessMimeType(uri) } as unknown as Blob;
}

interface TrainerFilterParams {
  query?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  size?: number;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  hasMore: boolean;
}

export const TrainerApi = {
  filter: (params: TrainerFilterParams = {}) =>
    apiClient
      .get<PagedResponse<TrainerProfile>>(ENDPOINTS.trainers.filter, { params })
      .then((r) => r.data),

  getById: (id: number) =>
    apiClient.get<TrainerProfile>(ENDPOINTS.trainers.byId(id)).then((r) => r.data),

  getMyProfile: () =>
    apiClient.get<TrainerProfile>(ENDPOINTS.trainers.me).then((r) => r.data),

  upsertMyProfile: (payload: UpsertTrainerProfilePayload, profileImageUri?: string, coverImageUri?: string) => {
    const formData = new FormData();
    formData.append('request', jsonPart(payload));
    if (profileImageUri) formData.append('profileImage', filePart(profileImageUri, `profile-${Date.now()}.jpg`));
    if (coverImageUri) formData.append('coverImage', filePart(coverImageUri, `cover-${Date.now()}.jpg`));
    return apiClient.put<TrainerProfile>(ENDPOINTS.trainers.me, formData).then((r) => r.data);
  },

  createSession: (payload: CreateSessionPayload, imageUri?: string) => {
    const formData = new FormData();
    formData.append('request', jsonPart(payload));
    if (imageUri) formData.append('image', filePart(imageUri, `session-${Date.now()}.jpg`));
    return apiClient.post<TrainerSession>(ENDPOINTS.trainers.sessionsCreate, formData).then((r) => r.data);
  },

  updateSession: (id: number, payload: CreateSessionPayload, imageUri?: string) => {
    const formData = new FormData();
    formData.append('request', jsonPart(payload));
    if (imageUri) formData.append('image', filePart(imageUri, `session-${Date.now()}.jpg`));
    return apiClient.put<TrainerSession>(ENDPOINTS.trainers.sessionUpdate(id), formData).then((r) => r.data);
  },

  getMySessions: () =>
    apiClient.get<TrainerSession[]>(ENDPOINTS.trainers.sessionsMine).then((r) => r.data),

  getSessionsForTrainer: (trainerFirebaseUid: string) =>
    apiClient.get<TrainerSession[]>(ENDPOINTS.trainers.sessionsForTrainer(trainerFirebaseUid)).then((r) => r.data),

  getSessionById: (id: number) =>
    apiClient.get<TrainerSession>(ENDPOINTS.trainers.sessionById(id)).then((r) => r.data),

  generateSlots: (sessionId: number, from: string, to: string) =>
    apiClient
      .post<TrainerSessionSlot[]>(ENDPOINTS.trainers.generateSlots(sessionId), null, { params: { from, to } })
      .then((r) => r.data),

  getSlots: (sessionId: number, from?: string, to?: string) =>
    apiClient
      .get<TrainerSessionSlot[]>(ENDPOINTS.trainers.slots(sessionId), { params: { from, to } })
      .then((r) => r.data),

  cancelSlot: (sessionId: number, slotId: number) =>
    apiClient
      .patch<TrainerSessionSlot>(ENDPOINTS.trainers.cancelSlot(sessionId, slotId))
      .then((r) => r.data),

  /** Puts a cancelled, still-upcoming date back on sale. */
  reopenSlot: (sessionId: number, slotId: number) =>
    apiClient
      .patch<TrainerSessionSlot>(ENDPOINTS.trainers.reopenSlot(sessionId, slotId))
      .then((r) => r.data),

  /** T9: start or replace a session's discount. */
  setSessionPromotion: (sessionId: number, promo: Promotion) =>
    apiClient.put<TrainerSession>(ENDPOINTS.trainers.sessionPromotion(sessionId), promo).then((r) => r.data),

  clearSessionPromotion: (sessionId: number) =>
    apiClient.delete<TrainerSession>(ENDPOINTS.trainers.sessionPromotion(sessionId)).then((r) => r.data),

  // T4/T5/T6 — plans
  getMyPlans: () => apiClient.get<TrainerPlan[]>(ENDPOINTS.trainers.plansMine).then((r) => r.data),
  getPlanSales: () => apiClient.get<TrainerPlanSale[]>(ENDPOINTS.trainers.planSales).then((r) => r.data),
  createPlan: (payload: TrainerPlanPayload) =>
    apiClient.post<TrainerPlan>(ENDPOINTS.trainers.plans, payload).then((r) => r.data),
  updatePlan: (id: number, payload: TrainerPlanPayload) =>
    apiClient.put<TrainerPlan>(ENDPOINTS.trainers.plan(id), payload).then((r) => r.data),
  setPlanActive: (id: number, active: boolean) =>
    apiClient.patch<TrainerPlan>(ENDPOINTS.trainers.planActive(id), { active }).then((r) => r.data),
  // A plan for each customer
  getPlanCustomers: () => apiClient.get<TrainerCustomer[]>(ENDPOINTS.trainers.planCustomers).then((r) => r.data),
  assignPlan: (planId: number, customerUid: string, content?: string) =>
    apiClient.post<TrainerPlanSale>(ENDPOINTS.trainers.planAssign(planId), { customerUid, content }).then((r) => r.data),
  updatePersonalPlan: (purchaseId: number, content: string) =>
    apiClient.put<TrainerPlanSale>(ENDPOINTS.trainers.planPersonal(purchaseId), { content }).then((r) => r.data),

  setMySpecialities: (specialities: string[]) =>
    apiClient.put<TrainerProfile>(ENDPOINTS.trainers.mySpecialities, { specialities }).then((r) => r.data),

  addMyMedia: (media: PickedMedia) => {
    const formData = new FormData();
    formData.append('file', mediaFilePart(media));
    return apiClient
      .post<TrainerProfile>(ENDPOINTS.trainers.myMedia, formData, { timeout: MEDIA_UPLOAD_TIMEOUT_MS })
      .then((r) => r.data);
  },

  removeMyMedia: (url: string) =>
    apiClient.delete<TrainerProfile>(ENDPOINTS.trainers.myMedia, { params: { url } }).then((r) => r.data),

  getRoster: (sessionId: number, slotId: number) =>
    apiClient
      .get<TrainerBooking[]>(ENDPOINTS.trainers.roster(sessionId), { params: { slotId } })
      .then((r) => r.data),

  // Every upcoming date across every session this trainer owns — "All Dates" screen.
  getAllUpcomingSlots: (params: { date?: string; query?: string; page?: number; size?: number } = {}) =>
    apiClient
      .get<PagedResponse<TrainerSlotOverview>>(ENDPOINTS.trainers.allUpcomingSlots, { params })
      .then((r) => r.data),
};
