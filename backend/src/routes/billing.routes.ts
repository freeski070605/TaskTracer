import { Router } from 'express';
import {
  cancelSubscription,
  getBillingSummary,
  subscribe,
  webhook,
} from '../controllers/billing.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { requireTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import { subscribeSchema } from '../validators/billing.schema';

const router = Router();

router.post('/webhook', webhook);
router.use(requireAuth, requireTenant, requireRole('admin', 'superadmin'));
router.get('/summary', getBillingSummary);
router.post('/subscribe', validate(subscribeSchema), subscribe);
router.post('/cancel', cancelSubscription);

export default router;
