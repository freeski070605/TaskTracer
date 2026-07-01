import { env } from './env';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const wildcardToRegExp = (origin: string) => {
  const pattern = origin.split('*').map(escapeRegExp).join('.*');
  return new RegExp(`^${pattern}$`);
};

const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAll = corsOrigins.includes('*');
const exactOrigins = new Set(corsOrigins.filter((origin) => !origin.includes('*')));
const wildcardOrigins = corsOrigins.filter((origin) => origin.includes('*')).map(wildcardToRegExp);

export const isOriginAllowed = (origin?: string) => {
  if (!origin || allowAll) return true;
  if (exactOrigins.has(origin)) return true;
  return wildcardOrigins.some((allowedOrigin) => allowedOrigin.test(origin));
};

