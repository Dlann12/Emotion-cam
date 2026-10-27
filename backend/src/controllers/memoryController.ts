import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/db';
import fs from 'fs';
import path from 'path';

function saveBase64Image(dataString: string): string | null {
  try {
    const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }
    const extension = matches[1].split('/')[1] || 'jpg';
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `memory-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
  } catch (error) {
    console.error('Error saving memory image:', error);
    return null;
  }
}

export const getMemories = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const memories = await prisma.memory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        emotionDetection: {
          include: {
            emotionScores: true,
          },
        },
      },
    });

    res.json({ data: memories });
  } catch (err: any) {
    console.error('Get memories error:', err);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
};

export const createMemory = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { title, description, image, imageUrl, emotionDetectionId, emotion, confidence, bbox, scores } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Memory title is required' });
    return;
  }

  try {
    let finalImageUrl = imageUrl || '';
    if (image && image.startsWith('data:image')) {
      const savedPath = saveBase64Image(image);
      if (savedPath) {
        finalImageUrl = savedPath;
      }
    }

    let detectionId = emotionDetectionId;

    if (!detectionId) {
      const newDetection = await prisma.emotionDetection.create({
        data: {
          userId,
          imageUrl: finalImageUrl || null,
          emotion: emotion || 'happy',
          confidence: Number(confidence) || 0.9,
          bbox: JSON.stringify(bbox || [0, 0, 100, 100]),
          emotionScores: {
            create: Object.entries(scores || { happy: 0.9, neutral: 0.1 }).map(([emo, score]) => ({
              emotion: emo,
              score: typeof score === 'number' ? score : 0,
            })),
          },
        },
      });
      detectionId = newDetection.id;
    }

    const memory = await prisma.memory.create({
      data: {
        userId,
        emotionDetectionId: detectionId,
        title,
        description: description || null,
        imageUrl: finalImageUrl || '/uploads/placeholder.jpg',
      },
      include: {
        emotionDetection: {
          include: {
            emotionScores: true,
          },
        },
      },
    });

    res.status(201).json({ success: true, data: memory });
  } catch (err: any) {
    console.error('Create memory error:', err);
    res.status(500).json({ error: 'Failed to create memory', message: err.message });
  }
};

export const deleteMemory = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const id = req.params.id as string;

  if (!userId || !id) {
    res.status(401).json({ error: 'Unauthorized or missing ID' });
    return;
  }

  try {
    const memory = await prisma.memory.findFirst({
      where: { id, userId },
    });

    if (!memory) {
      res.status(404).json({ error: 'Memory not found' });
      return;
    }

    if (memory.imageUrl && memory.imageUrl.startsWith('/uploads/')) {
      const fullPath = path.join(process.cwd(), memory.imageUrl);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch {}
      }
    }

    await prisma.memory.delete({ where: { id } });
    res.json({ success: true, message: 'Memory deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete memory' });
  }
};
