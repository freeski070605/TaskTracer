const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  let res: Response;

  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new Error(`Unable to reach the API at ${API_URL}. Check that the backend is running and CORS allows this web origin.`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Request failed');
  }
  return res.json() as Promise<T>;
};
