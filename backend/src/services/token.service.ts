import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '../utils/constants';

export interface TokenPayload {
  sub: string;
  tenantId: string;
  role: Role;
}

const signWithExpiry = (payload: TokenPayload, secret: string, expiresIn: string) =>
  jwt.sign(payload, secret, { expiresIn } as SignOptions);

export const signAccessToken = (payload: TokenPayload) => {
  return signWithExpiry(payload, env.JWT_SECRET, env.JWT_ACCESS_TTL);
};

export const signRefreshToken = (payload: TokenPayload) => {
  return signWithExpiry(payload, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_TTL);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
};
