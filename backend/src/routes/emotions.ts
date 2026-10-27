import { Router } from 'express';
import multer from 'multer';
import {
  detectEmotion,
  saveDetection,
  getHistory,
  deleteDetection,
  clearHistory,
} from '../controllers/emotionController';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { detectLimiter } from '../middlewares/validators';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Real-time detection route: supports both authenticated user and guest mode with GPU rate limiting
router.post('/detect', detectLimiter, optionalAuth, upload.single('file'), detectEmotion);

// Authenticated user actions
router.post('/save', authenticate, saveDetection);
router.get('/', authenticate, getHistory);
router.delete('/:id', authenticate, deleteDetection);
router.delete('/', authenticate, clearHistory);

export default router;
