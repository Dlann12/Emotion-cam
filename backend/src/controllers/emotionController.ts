import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/db';
import fs from 'fs';
import path from 'path';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

function saveBase64Image(dataString: string): string | null {
  try {
    const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }
    const extension = matches[1].split('/')[1] || 'jpg';
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `face-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
  } catch (error) {
    console.error('Error saving image:', error);
    return null;
  }
}

export const detectEmotion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let mlResponseData: any = null;

    if (req.file) {
      const formData = new FormData();
      const fileBlob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });
      formData.append('file', fileBlob, req.file.originalname || 'frame.jpg');

      const response = await fetch(`${ML_SERVICE_URL}/predict`, {
        method: 'POST',
        body: formData,
      });
      mlResponseData = await response.json();
    } else if (req.body.image) {
      const response = await fetch(`${ML_SERVICE_URL}/predict-base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: req.body.image }),
      });
      mlResponseData = await response.json();
    } else {
      res.status(400).json({ error: 'No image provided. Send a file or base64 image.' });
      return;
    }

    if (!mlResponseData || !mlResponseData.success) {
      res.status(502).json({
        error: mlResponseData?.error || 'ML Service failed to process the image',
        faces: [],
      });
      return;
    }

    // Auto-save detection if user is logged in and requested or configured
    let savedRecordId: string | null = null;
    const userId = req.user?.id;
    const shouldAutoSave = req.query.autoSave === 'true' || req.body.autoSave === true;

    if (userId && shouldAutoSave && mlResponseData.faces.length > 0) {
      const privacy = await prisma.privacySetting.findUnique({ where: { userId } });
      if (!privacy || privacy.saveHistory !== false) {
        const primaryFace = mlResponseData.faces[0];
        let savedImageUrl: string | null = null;

        if (privacy?.saveFaceImages !== false && req.body.image) {
          savedImageUrl = saveBase64Image(req.body.image);
        }

        const record = await prisma.emotionDetection.create({
          data: {
            userId,
            imageUrl: savedImageUrl,
            emotion: primaryFace.emotion,
            confidence: primaryFace.confidence,
            bbox: JSON.stringify(primaryFace.bbox),
            emotionScores: {
              create: Object.entries(primaryFace.scores || {}).map(([emotion, score]) => ({
                emotion,
                score: typeof score === 'number' ? score : 0,
              })),
            },
          },
        });
        savedRecordId = record.id;
      }
    }

    res.json({
      success: true,
      faces: mlResponseData.faces,
      savedRecordId,
    });
  } catch (err: any) {
    console.error('Detection error:', err);
    res.status(500).json({ error: 'Internal server error during detection', message: err.message });
  }
};

export const saveDetection = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { face, image } = req.body;
  if (!face || !face.emotion) {
    res.status(400).json({ error: 'Invalid face detection payload' });
    return;
  }

  try {
    const privacy = await prisma.privacySetting.findUnique({ where: { userId } });
    let savedImageUrl: string | null = null;

    if (privacy?.saveFaceImages !== false && image) {
      savedImageUrl = saveBase64Image(image);
    }

    const detection = await prisma.emotionDetection.create({
      data: {
        userId,
        imageUrl: savedImageUrl,
        emotion: face.emotion,
        confidence: Number(face.confidence) || 0.8,
        bbox: JSON.stringify(face.bbox || [0, 0, 100, 100]),
        emotionScores: {
          create: Object.entries(face.scores || {}).map(([emotion, score]) => ({
            emotion,
            score: typeof score === 'number' ? score : 0,
          })),
        },
      },
      include: {
        emotionScores: true,
      },
    });

    res.json({ success: true, detection });
  } catch (err: any) {
    console.error('Save detection error:', err);
    res.status(500).json({ error: 'Failed to save detection' });
  }
};

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const emotionFilter = req.query.emotion as string;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const where: any = { userId };
  if (emotionFilter) {
    where.emotion = emotionFilter;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  try {
    const [total, detections] = await Promise.all([
      prisma.emotionDetection.count({ where }),
      prisma.emotionDetection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          emotionScores: true,
        },
      }),
    ]);

    const formatted = detections.map((d) => ({
      ...d,
      bbox: typeof d.bbox === 'string' ? JSON.parse(d.bbox) : d.bbox,
    }));

    res.json({
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Failed to fetch detection history' });
  }
};

export const deleteDetection = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const id = req.params.id as string;

  if (!userId || !id) {
    res.status(401).json({ error: 'Unauthorized or missing ID' });
    return;
  }

  try {
    const existing = await prisma.emotionDetection.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Detection not found' });
      return;
    }

    if (existing.imageUrl && existing.imageUrl.startsWith('/uploads/')) {
      const fullPath = path.join(process.cwd(), existing.imageUrl);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch {}
      }
    }

    await prisma.emotionDetection.delete({ where: { id } });
    res.json({ success: true, message: 'Detection deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete detection' });
  }
};

export const clearHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Find all records with images for this user to delete files from disk
    const detectionsWithImages = await prisma.emotionDetection.findMany({
      where: { userId, imageUrl: { not: null } },
      select: { imageUrl: true },
    });

    for (const d of detectionsWithImages) {
      if (d.imageUrl && d.imageUrl.startsWith('/uploads/')) {
        const fullPath = path.join(process.cwd(), d.imageUrl);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch {}
        }
      }
    }

    await prisma.emotionDetection.deleteMany({ where: { userId } });
    res.json({ success: true, message: 'All detection history and image files cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
};
