import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import Company from '../models/company.model';
import User from '../models/user.model';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { PLATFORM_TENANT_ID, syncCompanyIdentity } from '../utils/organization';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const token = header.split(' ')[1];
  const payload = jwt.verify(token, env.JWT_SECRET) as {
    sub: string;
    tenantId: string;
    role: string;
  };

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  req.user = user;

  if (user.tenantId === PLATFORM_TENANT_ID) {
    req.company = undefined;
    req.tenantId = undefined;
    next();
    return;
  }

  const company = await Company.findOne({ tenantId: user.tenantId });
  if (!company) {
    throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
  }
  if (!company.isActive) {
    throw new AppError('Workspace is inactive', 403, 'WORKSPACE_INACTIVE');
  }

  req.company = await syncCompanyIdentity(company);
  req.tenantId = user.tenantId;
  next();
});

