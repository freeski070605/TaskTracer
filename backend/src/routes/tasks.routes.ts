import { Router } from 'express';
import { completeTaskHandler, listTasks, requestUpload } from '../controllers/tasks.controller';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import { completeTaskSchema, uploadProofSchema } from '../validators/tasks.schema';

const router = Router();

router.use(requireAuth, requireTenant);
router.get('/', listTasks);
router.post('/complete', validate(completeTaskSchema), completeTaskHandler);
router.post('/upload-proof', validate(uploadProofSchema), requestUpload);

export default router;
