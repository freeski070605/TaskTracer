import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const requestId = req.requestId;

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: err.flatten(),
        requestId,
      },
    });
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'SERVER_ERROR';
  res.status(statusCode).json({
    error: {
      code,
      message: err.message || 'Internal Server Error',
      requestId,
    },
  });
};
