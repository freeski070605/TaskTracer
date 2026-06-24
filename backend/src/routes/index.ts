import { Router } from 'express';
import authRoutes from './auth.routes';
import taskRoutes from './tasks.routes';
import supervisorRoutes from './supervisor.routes';
import adminRoutes from './admin.routes';
import billingRoutes from './billing.routes';
import settingsRoutes from './settings.routes';
import superadminRoutes from './superadmin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/supervisor', supervisorRoutes);
router.use('/admin', adminRoutes);
router.use('/billing', billingRoutes);
router.use('/settings', settingsRoutes);
router.use('/superadmin', superadminRoutes);

export default router;
