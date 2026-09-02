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
