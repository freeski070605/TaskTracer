import { Router } from 'express';
import {
  createDuty,
  createLocation,
  createSchedule,
  createUser,
  listSchedules,
  listDuties,
  listLocations,
  listUsers,
  reports,
  updateUser,
} from '../controllers/admin.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { requireTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import {
  createDutySchema,
  createLocationSchema,
  createScheduleSchema,
  createUserSchema,
  updateUserSchema,
} from '../validators/admin.schema';

const router = Router();

router.use(requireAuth, requireTenant, requireRole('admin', 'superadmin'));
router.get('/duties', listDuties);
router.post('/duties', validate(createDutySchema), createDuty);
router.get('/users', listUsers);
router.post('/users', validate(createUserSchema), createUser);
router.patch('/users/:userId', validate(updateUserSchema), updateUser);
router.get('/locations', listLocations);
router.post('/locations', validate(createLocationSchema), createLocation);
router.get('/schedule', listSchedules);
router.post('/schedule', validate(createScheduleSchema), createSchedule);
router.get('/reports', reports);

export default router;
