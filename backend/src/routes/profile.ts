import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController';
import { authenticate } from '../middlewares/auth';
import { validateBody, updateProfileSchema } from '../middlewares/validators';

const router = Router();

router.get('/', authenticate, getProfile);
router.put('/', authenticate, validateBody(updateProfileSchema), updateProfile);

export default router;
