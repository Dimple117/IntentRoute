import { API } from './constants';

export function headers(token) {
  return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
}

// Reads the body as text first, only parses JSON if there's actually something there.
export async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    console.error('Non-JSON response body:', text);
    return null;
  }
}

async function handle(r, onUnauthorized) {
  if (r.status === 401) {
    if (onUnauthorized) onUnauthorized();
    throw new Error('Session expired');
  }
  if (!r.ok) {
    const errBody = await safeJson(r.clone());
    throw new Error(errBody?.message || `Request failed (${r.status})`);
  }
  return r;
}

export async function apiFetch(url, token, opts = {}, onUnauthorized) {
  const r = await fetch(API + url, { headers: headers(token), ...opts });
  return handle(r, onUnauthorized);
}

export async function apiPublic(url, opts = {}) {
  const r = await fetch(API + url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return handle(r, null);
}