"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = void 0;
const db_1 = __importDefault(require("../config/db"));
const getAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalAllTime, totalToday, total7Days, total30Days, allDetections] = yield Promise.all([
            db_1.default.emotionDetection.count({ where: { userId } }),
            db_1.default.emotionDetection.count({ where: { userId, createdAt: { gte: startOfToday } } }),
            db_1.default.emotionDetection.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } }),
            db_1.default.emotionDetection.count({ where: { userId, createdAt: { gte: thirtyDaysAgo } } }),
            db_1.default.emotionDetection.findMany({
                where: { userId, createdAt: { gte: thirtyDaysAgo } },
                select: { emotion: true, confidence: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);
        // Emotion distribution breakdown
        const distribution = {
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
        const dailyMap = {};
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
    }
    catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Failed to generate analytics' });
    }
});
exports.getAnalytics = getAnalytics;
