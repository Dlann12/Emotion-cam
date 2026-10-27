import { Router } from 'express';
import { getMemories, createMemory, deleteMemory } from '../controllers/memoryController';
import { authenticate } from '../middlewares/auth';
import { validateBody, createMemorySchema } from '../middlewares/validators';

const router = Router();

router.get('/', authenticate, getMemories);
router.post('/', authenticate, validateBody(createMemorySchema), createMemory);
router.delete('/:id', authenticate, deleteMemory);

export default router;
