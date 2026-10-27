import { Router } from 'express';
import { getPrivacy, updatePrivacy } from '../controllers/privacyController';
import { authenticate } from '../middlewares/auth';
import { validateBody, privacySchema } from '../middlewares/validators';

const router = Router();

router.get('/', authenticate, getPrivacy);
router.put('/', authenticate, validateBody(privacySchema), updatePrivacy);

export default router;
