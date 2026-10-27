import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/db';
import bcrypt from 'bcrypt';

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        privacySetting: true,
        userPreference: true,
        _count: {
          select: {
            emotionDetections: true,
            memories: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      stats: {
        totalDetections: user._count.emotionDetections,
        totalMemories: user._count.memories,
      },
      privacySetting: user.privacySetting,
      userPreference: user.userPreference,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { name, currentPassword, newPassword } = req.body;

  try {
    const updateData: any = {};
    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required to change password' });
        return;
      }

      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!currentUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const isValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isValid) {
        res.status(400).json({ error: 'Incorrect current password' });
        return;
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, updatedAt: true },
    });

    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
