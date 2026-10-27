import { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';
import rateLimit from 'express-rate-limit';

// Rate Limiter for Authentication (prevents brute-force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // limit each IP to 25 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan autentikasi. Silakan coba lagi setelah 15 menit.' },
});

// Rate Limiter for ML Detection (prevents GPU overload while allowing smooth 2-3 FPS real-time webcam)
export const detectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // up to 200 requests/min (~3 FPS)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Batas frekuensi deteksi terlampaui. Mengurangi kecepatan sampling frame.' },
});

// Generic Zod Validation Middleware
export const validateBody = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      res.status(400).json({
        error: 'Validasi gagal: ' + messages.join(', '),
        details: result.error.issues,
      });
      return;
    }
    req.body = result.data;
    next();
  };
};

// Zod Schemas
export const registerSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  name: z.string().min(2, 'Nama minimal 2 karakter').max(50, 'Nama maksimal 50 karakter'),
});

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password tidak boleh kosong'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter').optional(),
});

export const createMemorySchema = z.object({
  title: z.string().min(1, 'Judul kenangan tidak boleh kosong').max(100),
  description: z.string().max(500).optional(),
  image: z.string().optional(),
  imageUrl: z.string().optional(),
  emotionDetectionId: z.string().optional(),
  emotion: z.string().optional(),
  confidence: z.number().optional(),
  bbox: z.array(z.number()).optional(),
  scores: z.record(z.string(), z.number()).optional(),
});

export const privacySchema = z.object({
  saveFaceImages: z.boolean().optional(),
  saveHistory: z.boolean().optional(),
  dataUsageConsent: z.boolean().optional(),
});
