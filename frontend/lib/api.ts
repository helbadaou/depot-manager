const baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
const wsBaseUrl = process.env.NEXT_PUBLIC_WS_BASE || baseUrl.replace(/^http/, 'ws');

export type ApiError = Error & { status?: number; body?: unknown };

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) {
    return null;
  }

  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  const text = await res.text();
  return text || null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const body = await readBody(res);

  if (!res.ok) {
    const err = new Error(`Request failed: ${res.status}`) as ApiError;
    err.status = res.status;
    err.body = body;

    if (typeof body === 'string' && body.trim()) {
      err.message = body;
    } else if (body && typeof body === 'object') {
      const payload = body as { error?: string; message?: string };

      if (payload.error) {
        err.message = payload.error;
      } else if (payload.message) {
        err.message = payload.message;
      }
    }

    throw err;
  }

  return body as T;
}

export function getWebSocketUrl(path: string) {
  return `${wsBaseUrl}${path}`;
}

export const apiConfig = { baseUrl, wsBaseUrl };
