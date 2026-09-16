import { API_BASE_URL } from '@/api/client';

// Served by com.pasxo.controller.LegalController — public, no auth required.
// Same backend/pages the sibling User App links to. Functions, not frozen
// constants — API_BASE_URL is reassigned in place once client.ts's
// resolvePreferredBaseUrl() finishes probing Hostinger vs. local, so reading
// it eagerly at module-import time would freeze these to the pre-probe default.
export const getPrivacyPolicyUrl = () => `${API_BASE_URL}privacy`;
export const getTermsOfServiceUrl = () => `${API_BASE_URL}terms`;
