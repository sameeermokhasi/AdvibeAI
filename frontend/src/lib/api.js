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

export async function getAddyMemory() {
  return request('/api/v1/addy/memory', { method: 'GET' });
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

// 8. Memory & Learnings API
export async function getMemoryItems() {
  return request('/api/v1/memory', { method: 'GET' });
}

export async function addMemoryItem(data) {
  return request('/api/v1/memory', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function deleteMemoryItem(itemId) {
  return request(`/api/v1/memory/${itemId}`, { method: 'DELETE' });
}

// 9. Watchlist (Saved Leads & Firms) API
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

// 10. Exclusions API
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

// 11. Command Center & Commitments API
export async function getCommandCenter() {
  return request('/api/v1/command-center', { method: 'GET' });
}

export async function recordCommitment(data) {
  return request('/api/v1/command-center/commitment', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// 12. Raise Readiness Radar API
export async function getRaiseReadiness(companyId) {
  return request(`/api/v1/readiness/${companyId}`, { method: 'GET' });
}

