import { Client, Environment } from 'square';
import { env } from './env';

export const squareClient = new Client({
  environment: env.SQUARE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
  accessToken: env.SQUARE_ACCESS_TOKEN,
});
