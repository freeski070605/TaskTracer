import { Router } from 'express';
import { login, refresh, register } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { loginSchema, refreshSchema, registerSchema } from '../validators/auth.schema';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);

export default router;
