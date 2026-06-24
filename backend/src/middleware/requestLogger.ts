import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.headers['x-request-id'];
  const requestId = typeof incomingId === 'string' && incomingId.length > 0
    ? incomingId
    : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      requestId,
    });
  });

  next();
};
