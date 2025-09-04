const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const DEFAULT_TIMEOUT_MS = 5000;

async function request(path: string, init?: RequestInit & { timeoutMs?: number }) {
  const authRaw = localStorage.getItem('auth');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as any) };
  if (authRaw) {
    try {
      const { accessToken } = JSON.parse(authRaw);
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    } catch {}
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(base + path, { ...init, headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  let text = await res.text();
  let data = text ? JSON.parse(text) : null;
  if (res.status === 401) {
    // try refresh once
    try {
      const stored = localStorage.getItem('auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.refreshToken) {
          const r = await fetch(base + '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: parsed.refreshToken }),
          });
          const t = await r.text();
          const rd = t ? JSON.parse(t) : null;
          if (r.ok && rd?.accessToken) {
            const next = { ...parsed, accessToken: rd.accessToken, refreshToken: rd.refreshToken || parsed.refreshToken };
            localStorage.setItem('auth', JSON.stringify(next));
            // Trigger a storage event so AuthContext can update
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'auth',
              newValue: JSON.stringify(next),
              storageArea: localStorage
            }));
            const retryHeaders = { ...headers, Authorization: `Bearer ${rd.accessToken}` };
            const retryController = new AbortController();
            const retryTimeout = setTimeout(() => retryController.abort(), init?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
            try {
              res = await fetch(base + path, { ...init, headers: retryHeaders, signal: retryController.signal });
            } finally {
              clearTimeout(retryTimeout);
            }
            text = await res.text();
            data = text ? JSON.parse(text) : null;
          } else {
            // Refresh failed, clear auth data
            localStorage.removeItem('auth');
          }
        } else {
          // No refresh token, clear auth data
          localStorage.removeItem('auth');
        }
      }
    } catch {
      // Refresh attempt failed, clear auth data
      localStorage.removeItem('auth');
    }
  }
  if (!res.ok) throw Object.assign(new Error(data?.error || 'Request failed'), { status: res.status, data });
  return data;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body?: any) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};
