import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const requireTenant = (req: Request, _res: Response, next: NextFunction) => {
  const tenantId = req.tenantId || req.company?.tenantId || req.headers['x-tenant-id'];
  if (!tenantId || typeof tenantId !== 'string') {
    throw new AppError('Tenant required', 400, 'TENANT_REQUIRED');
  }
  req.tenantId = tenantId;
  next();
};
