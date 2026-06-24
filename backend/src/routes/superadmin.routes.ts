import { Router } from 'express';
import {
  createManualFinancialRecord,
  listCompanies,
  listFinancialRecords,
  listSubscriptions,
  saasMetrics,
  updateCompany,
  updateCompanySubscription,
} from '../controllers/superadmin.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createFinancialRecordSchema,
  updateCompanySchema,
  updateCompanySubscriptionSchema,
} from '../validators/superadmin.schema';

const router = Router();

router.use(requireAuth, requireRole('superadmin'));
router.get('/companies', listCompanies);
router.get('/metrics', saasMetrics);
router.get('/subscriptions', listSubscriptions);
router.get('/financial-records', listFinancialRecords);
router.post('/financial-records', validate(createFinancialRecordSchema), createManualFinancialRecord);
router.patch('/companies/:companyId', validate(updateCompanySchema), updateCompany);
router.patch('/companies/:companyId/subscription', validate(updateCompanySubscriptionSchema), updateCompanySubscription);

export default router;
