/**
 * Advibe API Client
 * -----------------
 * Centralized client abstraction connecting the React 18 frontend to the
 * FastAPI backend and PostgreSQL database.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Core wrapper around window.fetch with automatic Authorization header
 * injection and JSON error response parsing.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('advibe_token') || 'dev-mock-token';

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.detail || data?.message || `Request failed with status ${response.status}`;
      if (response.status === 403 && (data?.detail === 'phone_unverified' || errorMsg.includes('phone_unverified'))) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('phone_unverified'));
        }
      }
      throw new ApiError(errorMsg, response.status, data);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network connection error', 0, null);
  }
}

/**
 * Health check & DB connectivity ping
 * GET /health
 */
export async function checkHealth() {
  return request('/health', { method: 'GET' });
}

/**
 * Ingest pitch deck / website text to create company raise profile
 * POST /api/v1/intake
 */
export async function intakeCompany(payload) {
  return request('/api/v1/intake', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Retrieve company profile by ID
 * GET /api/v1/companies/{company_id}
 */
export async function getCompany(companyId) {
  return request(`/api/v1/companies/${companyId}`, {
    method: 'GET'
  });
}

/**
 * Generate ranked investor matches with dual-factor scoring
 * GET /api/v1/match/{company_id}
 */
export async function getMatches(companyId) {
  return request(`/api/v1/match/${companyId}`, {
    method: 'GET'
  });
}

/**
 * Generate bespoke outreach email drafts for selected decision makers
 * POST /api/v1/outreach/draft
 */
export async function draftOutreach(companyId, personIds, campaignName = null, channel = 'email') {
  return request('/api/v1/outreach/draft', {
    method: 'POST',
    body: JSON.stringify({
      company_id: companyId,
      person_ids: personIds,
      campaign_name: campaignName,
      channel: channel
    })
  });
}

/**
 * Send batch of approved messages via Resend
 * POST /api/v1/outreach/send
 */
export async function sendOutreach(campaignId, messageIds) {
  return request('/api/v1/outreach/send', {
    method: 'POST',
    body: JSON.stringify({
      campaign_id: campaignId,
      message_ids: messageIds
    })
  });
}

/**
 * Retrieve full CRM campaign status, sent metrics, and classified replies
 * GET /api/v1/campaigns/{company_id}
 */
export async function getCampaigns(companyId) {
  return request(`/api/v1/campaigns/${companyId}`, {
    method: 'GET'
  });
}

/**
 * Retrieve all investors and their decision-makers
 * GET /api/v1/investors
 */
export async function getInvestors() {
  return request('/api/v1/investors', {
    method: 'GET'
  });
}

/**
 * ============================================================================
 * Advibe V2 Parity API Client Methods (8raise Feature Scope)
 * ============================================================================
 */

// 1. Tracks (Venture, Real Estate, Fund LP)
export async function getTrackInvestors(trackName = 'venture', filters = {}) {
  const params = new URLSearchParams();
  if (filters.stage) params.append('stage', filters.stage);
  if (filters.sector) params.append('sector', filters.sector);
  if (filters.geography) params.append('geography', filters.geography);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/v1/tracks/${trackName}/investors${qs}`, { method: 'GET' });
}

export async function getInvestorDossier(trackName = 'venture', investorId) {
  return request(`/api/v1/tracks/${trackName}/dossier/${investorId}`, { method: 'GET' });
}

// 2. ADDY Conversational Agent
export async function sendAddyMessage(message, options = {}) {
  return request('/api/v1/addy/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      step: options.step || 'discover',
      track: options.track || 'venture',
      company_id: options.company_id || null,
      conversation_id: options.conversation_id || null
    })
  });
}

export async function confirmAddySearch(payload) {
  return request('/api/v1/addy/search-confirm', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getAddyChatHistory() {
  return request('/api/v1/addy/history', { method: 'GET' });
}

// 3. Twin Finder (Lookalike Investor Discovery)
export async function getTwinFinderComps(brief, track = 'venture') {
  return request('/api/v1/twin-finder/comparables', {
    method: 'POST',
    body: JSON.stringify({ brief, track })
  });
}

export async function getTwinFinderFirms(brief, track = 'venture') {
  return request('/api/v1/twin-finder/firms', {
    method: 'POST',
    body: JSON.stringify({ brief, track })
  });
}

export async function getTwinFinderByInvestor(name, track = 'venture') {
  return request('/api/v1/twin-finder/by-investor', {
    method: 'POST',
    body: JSON.stringify({ name, track })
  });
}


// 4. Resolve (Bulk Enrichment)
export async function resolvePastedFirms(firmNames, track = 'venture') {
  return request('/api/v1/resolve/paste', {
    method: 'POST',
    body: JSON.stringify({ firm_names: firmNames, track })
  });
}

export async function resolveUploadedFile(formData) {
  const token = localStorage.getItem('advibe_token') || 'dev-mock-token';
  const response = await fetch(`${API_BASE_URL}/api/v1/resolve/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: formData
  });
  if (!response.ok) {
    throw new ApiError('File enrichment failed', response.status);
  }
  return response.json();
}

export function getResolveExportUrl(batchId) {
  return `${API_BASE_URL}/api/v1/resolve/${batchId}/export.csv`;
}

// 5. Pulse CRM Overview & Live Rollups
export async function getPulseOverview() {
  return request('/api/v1/campaigns/pulse/overview', { method: 'GET' });
}

// 6. Account, Quotas, Pricing & Scale Telemetry
export async function getUserAccount() {
  return request('/api/v1/account/me', { method: 'GET' });
}

export async function claimDiscount(planTier = 'solo', billingInterval = 'monthly') {
  return request('/api/v1/account/claim-discount', {
    method: 'POST',
    body: JSON.stringify({ plan_tier: planTier, billing_interval: billingInterval })
  });
}

export async function inviteTeamMember(email, role = 'Member') {
  return request('/api/v1/account/team/invite', {
    method: 'POST',
    body: JSON.stringify({ email, role })
  });
}

export async function getLiveStats() {
  return request('/api/v1/stats/live', { method: 'GET' });
}

export async function getPlaybookResources() {
  return request('/api/v1/playbooks', { method: 'GET' });
}

export async function claimPlaybook(resourceId) {
  return request(`/api/v1/playbooks/${resourceId}/claim`, { method: 'POST' });
}

// 7. Authentication API
export async function authSignup(email, password, fullName = '') {
  return request('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name: fullName })
  });
}

export async function authLogin(email, password) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function authRefreshToken() {
  return request('/api/v1/auth/refresh', { method: 'POST' });
}

export async function getAuthMe() {
  return request('/api/v1/auth/me', { method: 'GET' });
}

// 8. Email Unlock & Sparks API
export async function unlockInvestorEmail(personId, idempotencyKey = null) {
  return request('/api/v1/unlock', {
    method: 'POST',
    body: JSON.stringify({ person_id: personId, idempotency_key: idempotencyKey })
  });
}

export async function topUpSparks(amount, packId = null) {
  return request('/api/v1/sparks/top-up', {
    method: 'POST',
    body: JSON.stringify({ amount: parseFloat(amount), pack_id: packId })
  });
}

// 9. HeyReach Integration API
export async function getHeyReachStatus() {
  return request('/api/v1/campaigns/heyreach/status', { method: 'GET' });
}

export async function connectHeyReach(apiKey) {
  return request('/api/v1/campaigns/heyreach/connect', {
    method: 'POST',
    body: JSON.stringify({ api_key: apiKey })
  });
}

export async function disconnectHeyReach() {
  return request('/api/v1/campaigns/heyreach/disconnect', { method: 'POST' });
}

// 10. Scheduled Autopilot Jobs API
export async function getScheduledJobs() {
  return request('/api/v1/scheduled-jobs', { method: 'GET' });
}

export async function createScheduledJob(data) {
  return request('/api/v1/scheduled-jobs', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function pauseScheduledJob(jobId) {
  return request(`/api/v1/scheduled-jobs/${jobId}/pause`, { method: 'POST' });
}

export async function resumeScheduledJob(jobId) {
  return request(`/api/v1/scheduled-jobs/${jobId}/resume`, { method: 'POST' });
}

export async function cancelScheduledJob(jobId) {
  return request(`/api/v1/scheduled-jobs/${jobId}/cancel`, { method: 'POST' });
}

// 11. Watchlist (Saved Leads - People Only) API
export async function getWatchlist() {
  return request('/api/v1/watchlist', { method: 'GET' });
}

export async function addToWatchlist(data) {
  return request('/api/v1/watchlist', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function removeFromWatchlist(itemId) {
  return request(`/api/v1/watchlist/${itemId}`, { method: 'DELETE' });
}

// 12. Exclusions API
export async function getExclusions() {
  return request('/api/v1/exclusions', { method: 'GET' });
}

export async function addExclusion(data) {
  return request('/api/v1/exclusions', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function removeExclusion(itemId) {
  return request(`/api/v1/exclusions/${itemId}`, { method: 'DELETE' });
}

// 13. Command Center & Commitments API
export async function getCommandCenter() {
  return request('/api/v1/command-center', { method: 'GET' });
}

export async function recordCommitment(data) {
  return request('/api/v1/command-center/commitment', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// 14. Raise Readiness Radar API
export async function getRaiseReadiness(companyId = null) {
  const path = companyId && companyId !== 'null' && companyId !== 'undefined'
    ? `/api/v1/readiness/${companyId}`
    : '/api/v1/readiness';
  return request(path, { method: 'GET' });
}

export async function evaluateRaiseReadiness(companyId = null, workspaceId = null) {
  return request('/api/v1/readiness/evaluate', {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId, workspace_id: workspaceId })
  });
}

// 15. Razorpay Payments & Billing API
export async function createRazorpayOrder(itemType, itemId, billingInterval = 'monthly') {
  return request('/api/v1/billing/order', {
    method: 'POST',
    body: JSON.stringify({ item_type: itemType, item_id: itemId, billing_interval: billingInterval })
  });
}

export async function verifyRazorpayPayment(orderId, paymentId, signature) {
  return request('/api/v1/billing/verify', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, payment_id: paymentId, signature: signature })
  });
}
export async function getBillingHistory() {
  return request('/api/v1/billing/history', { method: 'GET' });
}

// 16. Phone Verification API
export async function sendPhoneOtp(phone) {
  return request('/api/v1/auth/phone/send', {
    method: 'POST',
    body: JSON.stringify({ phone })
  });
}

export async function verifyPhoneOtp(phone, code) {
  return request('/api/v1/auth/phone/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code })
  });
}

// 17. QR Code & Manual Billing API
export async function createQrPayment(planId) {
  return request('/api/v1/billing/qr', {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId })
  });
}

export async function getQrPaymentStatus(qrId) {
  return request(`/api/v1/billing/qr/${qrId}/status`, { method: 'GET' });
}

export async function submitManualPayment(utr, planId) {
  return request('/api/v1/billing/manual-review', {
    method: 'POST',
    body: JSON.stringify({ utr, plan_id: planId })
  });
}



