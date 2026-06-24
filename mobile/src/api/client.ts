const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Request failed');
  }
  return res.json() as Promise<T>;
};
