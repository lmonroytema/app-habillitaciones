export type ApiErrorPayload =
  | { message?: string; errors?: Record<string, string[]> }
  | Record<string, unknown>
  | string
  | null;

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload;

  constructor(status: number, message: string, payload: ApiErrorPayload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setToken(token: string | null) {
  if (!token) {
    localStorage.removeItem('auth_token');
    return;
  }
  localStorage.setItem('auth_token', token);
}

function getApiBaseUrl(): string {
  const fromWindow = (globalThis as unknown as { __API_BASE_URL__?: unknown }).__API_BASE_URL__;
  if (typeof fromWindow === 'string') return fromWindow;
  const fromStorage = localStorage.getItem('api_base_url');
  return fromStorage ?? '';
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  const needsAuth = init.auth ?? true;
  if (needsAuth) {
    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(apiUrl(path), {
    ...init,
    headers,
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      (typeof payload === 'object' && payload && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : null) ?? `Error HTTP ${res.status}`;
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}

export async function apiFetchBlob(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<Blob> {
  const headers = new Headers(init.headers);

  const needsAuth = init.auth ?? true;
  if (needsAuth) {
    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(apiUrl(path), {
    ...init,
    headers,
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
    const message =
      (typeof payload === 'object' && payload && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : null) ?? `Error HTTP ${res.status}`;
    throw new ApiError(res.status, message, payload);
  }

  return await res.blob();
}

export function toQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return;
    qs.set(k, String(v));
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}
