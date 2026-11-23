/**
 * Germin8 Real Backend API Client
 * Connects the Dashboard to the local Node.js + SQLite backend on http://localhost:4000
 */

export const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_BASE = API_ORIGIN + '/api';

function getAuthHeader() {
  const token = localStorage.getItem('germin8_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

// ─── AUTH WITH OTP ───────────────────────────────────────────────────────────
export async function sendOtp(phone) {
  return request('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone, otp) {
  const data = await request('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });
  if (data?.token) {
    localStorage.setItem('germin8_auth_token', data.token);
  }
  return data;
}

export async function getCurrentUser() {
  return request('/auth/me', { method: 'GET' });
}

export async function logoutUser() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } finally {
    localStorage.removeItem('germin8_auth_token');
  }
}

// ─── CLIENTS ─────────────────────────────────────────────────────────────────
export async function getClients() {
  return request('/clients', { method: 'GET' });
}

export async function createClient(clientData) {
  return request('/clients', {
    method: 'POST',
    body: JSON.stringify(clientData),
  });
}

// ─── ADT-1 DRAFTS ────────────────────────────────────────────────────────────
export async function getAdt1Drafts() {
  return request('/adt1/drafts', { method: 'GET' });
}

export async function getAdt1Draft(id) {
  return request(`/adt1/drafts/${id}`, { method: 'GET' });
}

export async function saveAdt1Draft(draftData) {
  return request('/adt1/drafts', {
    method: 'POST',
    body: JSON.stringify(draftData),
  });
}

// ─── PAYMENT VERIFICATION FOR TESTING ────────────────────────────────────────
export async function createPaymentOrder(draftId, amount = 500) {
  return request('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ draftId, amount }),
  });
}

export async function verifyPayment({ orderId, paymentId, signature, method = 'UPI Test' }) {
  return request('/payments/verify', {
    method: 'POST',
    body: JSON.stringify({ orderId, paymentId, signature, method }),
  });
}

// ─── RAZORPAY PAYMENT GATEWAY ───────────────────────────────────────────────
export async function createRazorpayOrder(draftId, amount = 500) {
  return request('/payments/razorpay/create-order', {
    method: 'POST',
    body: JSON.stringify({ draftId, amount }),
  });
}

export async function verifyRazorpayPayment({ orderId, paymentId, signature }) {
  return request('/payments/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify({ orderId, paymentId, signature }),
  });
}

// ─── GATEWAY: FILESURE & CLAUDE ──────────────────────────────────────────────
export async function getGatewayStatus() {
  return request('/gateway/status', { method: 'GET' });
}

export async function lookupCinGateway(cin) {
  return request('/gateway/filesure/cin-lookup', {
    method: 'POST',
    body: JSON.stringify({ cin }),
  });
}

export async function resolveCompany(q) {
  return request('/gateway/resolve', {
    method: 'POST',
    body: JSON.stringify({ q }),
  });
}

export async function getCompanyByCin(cin) {
  return request('/gateway/company', {
    method: 'POST',
    body: JSON.stringify({ cin }),
  });
}

export async function getFilingsByCin(cin) {
  return request('/gateway/filings', {
    method: 'POST',
    body: JSON.stringify({ cin }),
  });
}

export async function resolveDirector(q) {
  return request('/gateway/director-resolve', {
    method: 'POST',
    body: JSON.stringify({ q }),
  });
}

export async function getDirectorByDin(din) {
  return request('/gateway/director', {
    method: 'POST',
    body: JSON.stringify({ din }),
  });
}

export async function extractWithClaudeGateway(text) {
  return request('/gateway/claude/extract', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// ─── EXTENSION PUSH & JOBS ──────────────────────────────────────────────────
export async function pushToExtension(data) {
  return request('/extension/push', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getExtensionJobs() {
  return request('/extension/jobs', { method: 'GET' });
}

export async function getExtensionJobStatus(jobId) {
  return request(`/extension/jobs/${jobId}`, { method: 'GET' });
}

export async function updateExtensionJob(jobId, updates) {
  return request(`/extension/jobs/${jobId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ─── EXTENSION PAYLOAD ───────────────────────────────────────────────────────
export async function getAdt1ExtensionPayload(draftId) {
  return request(`/adt1/drafts/${draftId}/extension-payload`, { method: 'GET' });
}

