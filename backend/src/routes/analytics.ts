import { Router } from 'express';
import { getAnalytics } from '../controllers/analyticsController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', authenticate, getAnalytics);

export default router;
