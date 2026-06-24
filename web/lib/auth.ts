export const saveTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

export const saveUser = (user: unknown) => {
  localStorage.setItem('tasktracer.user', JSON.stringify(user));
};

export const loadUser = <T>() => {
  const raw = localStorage.getItem('tasktracer.user');
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem('tasktracer.user');
    return null;
  }
};

export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tasktracer.user');
};
