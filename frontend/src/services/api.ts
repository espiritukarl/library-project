const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function request(path: string, init?: RequestInit) {
  const authRaw = localStorage.getItem('auth');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as any) };
  if (authRaw) {
    try {
      const { accessToken } = JSON.parse(authRaw);
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    } catch {}
  }
  const res = await fetch(base + path, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw Object.assign(new Error(data?.error || 'Request failed'), { status: res.status, data });
  return data;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body?: any) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};

