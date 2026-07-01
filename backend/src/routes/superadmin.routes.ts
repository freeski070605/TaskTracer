import { Router } from 'express';
import {
  createCompany,
  createManualFinancialRecord,
  deleteCompany,
  deleteFinancialRecord,
  listCompanies,
  listFinancialRecords,
  listSubscriptions,
  saasMetrics,
  updateCompany,
  updateCompanySubscription,
  updateFinancialRecord,
} from '../controllers/superadmin.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createCompanySchema,
  createFinancialRecordSchema,
  updateCompanySchema,
  deleteCompanySchema,
  updateCompanySubscriptionSchema,
  updateFinancialRecordSchema,
} from '../validators/superadmin.schema';

const router = Router();

router.use(requireAuth, requireRole('superadmin'));
router.get('/companies', listCompanies);
router.get('/metrics', saasMetrics);
router.get('/subscriptions', listSubscriptions);
router.get('/financial-records', listFinancialRecords);
router.post('/companies', validate(createCompanySchema), createCompany);
router.post('/financial-records', validate(createFinancialRecordSchema), createManualFinancialRecord);
router.patch('/financial-records/:recordId', validate(updateFinancialRecordSchema), updateFinancialRecord);
router.delete('/financial-records/:recordId', deleteFinancialRecord);
router.patch('/companies/:companyId', validate(updateCompanySchema), updateCompany);
router.delete('/companies/:companyId', validate(deleteCompanySchema), deleteCompany);
router.patch('/companies/:companyId/subscription', validate(updateCompanySubscriptionSchema), updateCompanySubscription);

export default router;

