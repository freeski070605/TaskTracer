import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { redis } from './config/redis';
import routes from './routes';
import { errorHandler } from './middleware/error';
import { AppError } from './utils/errors';
import { apiRateLimiter } from './middleware/rateLimit';
import { requestLogger } from './middleware/requestLogger';

export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  const allowAll = corsOrigins.includes('*');

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowAll) return callback(null, true);
        if (corsOrigins.includes(origin)) return callback(null, true);
        return callback(new AppError('Not allowed by CORS', 403, 'CORS_BLOCKED'));
      },
      credentials: true,
    }),
  );
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as typeof req & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(apiRateLimiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', (_req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    const redisReady = redis.status === 'ready';
    const ok = mongoReady && redisReady;
    res.status(ok ? 200 : 503).json({
      status: ok ? 'ok' : 'degraded',
      mongo: mongoReady,
      redis: redisReady,
    });
  });
  app.use('/api', routes);

  app.use(errorHandler);

  return app;
};



