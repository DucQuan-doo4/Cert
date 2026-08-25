const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('certprep_token');
}

function setToken(token) {
  localStorage.setItem('certprep_token', token);
}

function clearToken() {
  localStorage.removeItem('certprep_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Lỗi không xác định');
  }
  return data;
}

// ── Auth ──
export async function register(email, password, displayName) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  setToken(data.token);
  return data.user;
}

export async function login(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function getMe() {
  return apiFetch('/auth/me');
}

export function logout() {
  clearToken();
}

export function isLoggedIn() {
  return !!getToken();
}

// ── Bookmarks ──
export async function getBookmarks() {
  return apiFetch('/user/bookmarks');
}

export async function toggleBookmark(examSlug, questionNumber, questionData) {
  return apiFetch('/user/bookmarks', {
    method: 'POST',
    body: JSON.stringify({ examSlug, questionNumber, questionData }),
  });
}

// ── History ──
export async function getHistory() {
  return apiFetch('/user/history');
}

export async function saveHistory(data) {
  return apiFetch('/user/history', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteHistoryItem(id) {
  return apiFetch(`/user/history/${id}`, { method: 'DELETE' });
}

export async function clearHistory() {
  return apiFetch('/user/history', { method: 'DELETE' });
}
