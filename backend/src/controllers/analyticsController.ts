import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/db';

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalAllTime, totalToday, total7Days, total30Days, allDetections] = await Promise.all([
      prisma.emotionDetection.count({ where: { userId } }),
      prisma.emotionDetection.count({ where: { userId, createdAt: { gte: startOfToday } } }),
      prisma.emotionDetection.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } }),
      prisma.emotionDetection.count({ where: { userId, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.emotionDetection.findMany({
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
        select: { emotion: true, confidence: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Emotion distribution breakdown
    const distribution: Record<string, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      fear: 0,
      surprise: 0,
      disgust: 0,
      neutral: 0,
    };

    let totalConfidence = 0;
    allDetections.forEach((d) => {
      distribution[d.emotion] = (distribution[d.emotion] || 0) + 1;
      totalConfidence += d.confidence;
    });

    const averageConfidence = allDetections.length > 0
      ? Number((totalConfidence / allDetections.length).toFixed(3))
      : 0;

    // Find dominant emotion
    let dominantEmotion = 'neutral';
    let maxCount = -1;
    Object.entries(distribution).forEach(([emo, count]) => {
      if (count > maxCount && count > 0) {
        maxCount = count;
        dominantEmotion = emo;
      }
    });

    // Daily breakdown for the last 7 days
    const dailyMap: Record<string, { total: number; emotions: Record<string, number> }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0];
      dailyMap[dateKey] = { total: 0, emotions: {} };
    }

    allDetections.forEach((d) => {
      const dateKey = d.createdAt.toISOString().split('T')[0];
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].total += 1;
        dailyMap[dateKey].emotions[d.emotion] = (dailyMap[dateKey].emotions[d.emotion] || 0) + 1;
      }
    });

    const dailyTimeline = Object.entries(dailyMap).map(([date, val]) => ({
      date,
      count: val.total,
      emotions: val.emotions,
    }));

    // Positive vs Negative sentiment summary
    const positiveCount = (distribution.happy || 0) + (distribution.surprise || 0) * 0.5;
    const negativeCount = (distribution.sad || 0) + (distribution.angry || 0) + (distribution.fear || 0) + (distribution.disgust || 0);
    const neutralCount = distribution.neutral || 0;
    const totalCount = allDetections.length || 1;

    res.json({
      summary: {
        totalAllTime,
        totalToday,
        total7Days,
        total30Days,
        dominantEmotion: allDetections.length > 0 ? dominantEmotion : 'neutral',
        averageConfidence,
        positiveRatio: Number((positiveCount / totalCount).toFixed(2)),
        negativeRatio: Number((negativeCount / totalCount).toFixed(2)),
        neutralRatio: Number((neutralCount / totalCount).toFixed(2)),
      },
      distribution,
      dailyTimeline,
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
};
