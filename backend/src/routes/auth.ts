import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { authLimiter, validateBody, registerSchema, loginSchema } from '../middlewares/validators';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.get('/me', authenticate, getMe);

export default router;
