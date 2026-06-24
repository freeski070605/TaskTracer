import { Router } from 'express';
import { approveTask, dashboard, rejectTask, reviewQueue } from '../controllers/supervisor.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { requireTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import { approveSchema, rejectSchema } from '../validators/supervisor.schema';

const router = Router();

router.use(requireAuth, requireTenant, requireRole('supervisor', 'admin', 'superadmin'));
router.get('/dashboard', dashboard);
router.get('/review', reviewQueue);
router.post('/approve', validate(approveSchema), approveTask);
router.post('/reject', validate(rejectSchema), rejectTask);

export default router;
