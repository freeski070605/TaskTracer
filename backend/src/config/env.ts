import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.string().default('4000'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  REDIS_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('*'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLOUDINARY_UPLOAD_PREFIX: z.string().default('https://api.cloudinary.com'),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('tasktracer'),
  SQUARE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  SQUARE_ACCESS_TOKEN: z.string().min(1),
  SQUARE_LOCATION_ID: z.string().min(1),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().min(1),
  SQUARE_WEBHOOK_URL: z.string().min(1).optional(),
  SQUARE_PLAN_STARTER_VARIATION_ID: z.string().optional(),
  SQUARE_PLAN_PRO_VARIATION_ID: z.string().optional(),
  SQUARE_PLAN_ENTERPRISE_VARIATION_ID: z.string().optional(),
  SUPERADMIN_EMAILS: z.string().optional(),
  BASE_URL: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PORT: Number(parsed.data.PORT),
};
