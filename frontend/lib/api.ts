const baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

export type ApiError = Error & { status?: number };

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || `Request failed: ${res.status}`) as ApiError;
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export const apiConfig = { baseUrl };
