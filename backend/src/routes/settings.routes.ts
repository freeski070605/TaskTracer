import { Router } from 'express';
import {
  changePassword,
  getSettings,
  updateProfile,
  updateWorkspace,
} from '../controllers/settings.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { requireTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import {
  changePasswordSchema,
  updateProfileSchema,
  updateWorkspaceSchema,
} from '../validators/settings.schema';

const router = Router();

router.use(requireAuth);
router.get('/', getSettings);
router.patch('/profile', validate(updateProfileSchema), updateProfile);
router.patch('/workspace', requireTenant, requireRole('admin', 'superadmin'), validate(updateWorkspaceSchema), updateWorkspace);
router.post('/password', validate(changePasswordSchema), changePassword);

export default router;
