import { API_BASE } from './config';

export class ApiError extends Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Remove Content-Type if body is FormData
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (path.includes('/api/auth/login') || path.includes('/api/auth/refresh')) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.message || 'Invalid credentials', body);
    }

    if (typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('accessToken', data.accessToken);
            
            // Retry the original request
            headers['Authorization'] = `Bearer ${data.accessToken}`;
            const retryRes = await fetch(`${API_BASE}${path}`, { ...options, headers });
            
            if (!retryRes.ok) {
              const body = await retryRes.json().catch(() => ({}));
              throw new ApiError(retryRes.status, body.message || `HTTP ${retryRes.status}`);
            }
            return retryRes.json() as Promise<T>;
          }
        } catch {
          // Silent fallback to standard logout if refresh fails
        }
      }

      // Token expired or invalid and refresh failed/missing
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('hms_user');
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Session expired');
  }

  if (res.status === 402) {
    const body = await res.json().catch(() => ({}));
    if (typeof window !== 'undefined') {
      window.location.href = '/activate';
    }
    throw new ApiError(res.status, body.message || 'License Required', body);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || `HTTP ${res.status}`, body);
  }

  return res.json() as Promise<T>;
}

// Convenience methods
export const api = {
  get:    <T>(path: string, options?: RequestInit) => apiFetch<T>(path, { ...options, method: 'GET' }),
  post:   <T>(path: string, body?: unknown, options?: RequestInit) => apiFetch<T>(path, { ...options, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown, options?: RequestInit) => apiFetch<T>(path, { ...options, method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put:    <T>(path: string, body?: unknown, options?: RequestInit) => apiFetch<T>(path, { ...options, method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestInit) => apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
