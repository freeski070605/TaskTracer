import { Request, Response, NextFunction } from 'express';
import { Role } from '../utils/constants';
import { AppError } from '../utils/errors';

export const requireRole = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
    next();
  };
};
