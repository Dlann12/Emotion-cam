import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/db';

export const getPrivacy = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    let privacy = await prisma.privacySetting.findUnique({ where: { userId } });
    if (!privacy) {
      privacy = await prisma.privacySetting.create({
        data: { userId },
      });
    }

    res.json(privacy);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch privacy settings' });
  }
};

export const updatePrivacy = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { saveFaceImages, saveHistory, dataUsageConsent } = req.body;

  try {
    const updated = await prisma.privacySetting.upsert({
      where: { userId },
      create: {
        userId,
        saveFaceImages: saveFaceImages !== undefined ? Boolean(saveFaceImages) : true,
        saveHistory: saveHistory !== undefined ? Boolean(saveHistory) : true,
        dataUsageConsent: dataUsageConsent !== undefined ? Boolean(dataUsageConsent) : false,
      },
      update: {
        ...(saveFaceImages !== undefined && { saveFaceImages: Boolean(saveFaceImages) }),
        ...(saveHistory !== undefined && { saveHistory: Boolean(saveHistory) }),
        ...(dataUsageConsent !== undefined && { dataUsageConsent: Boolean(dataUsageConsent) }),
      },
    });

    res.json({ success: true, privacy: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
};
