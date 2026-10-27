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
exports.deleteMemory = exports.createMemory = exports.getMemories = void 0;
const db_1 = __importDefault(require("../config/db"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function saveBase64Image(dataString) {
    try {
        const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return null;
        }
        const extension = matches[1].split('/')[1] || 'jpg';
        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = `memory-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
        const uploadDir = path_1.default.join(process.cwd(), 'uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path_1.default.join(uploadDir, fileName);
        fs_1.default.writeFileSync(filePath, buffer);
        return `/uploads/${fileName}`;
    }
    catch (error) {
        console.error('Error saving memory image:', error);
        return null;
    }
}
const getMemories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const memories = yield db_1.default.memory.findMany({
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
    }
    catch (err) {
        console.error('Get memories error:', err);
        res.status(500).json({ error: 'Failed to fetch memories' });
    }
});
exports.getMemories = getMemories;
const createMemory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
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
            const newDetection = yield db_1.default.emotionDetection.create({
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
        const memory = yield db_1.default.memory.create({
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
    }
    catch (err) {
        console.error('Create memory error:', err);
        res.status(500).json({ error: 'Failed to create memory', message: err.message });
    }
});
exports.createMemory = createMemory;
const deleteMemory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const id = req.params.id;
    if (!userId || !id) {
        res.status(401).json({ error: 'Unauthorized or missing ID' });
        return;
    }
    try {
        const memory = yield db_1.default.memory.findFirst({
            where: { id, userId },
        });
        if (!memory) {
            res.status(404).json({ error: 'Memory not found' });
            return;
        }
        if (memory.imageUrl && memory.imageUrl.startsWith('/uploads/')) {
            const fullPath = path_1.default.join(process.cwd(), memory.imageUrl);
            if (fs_1.default.existsSync(fullPath)) {
                try {
                    fs_1.default.unlinkSync(fullPath);
                }
                catch (_b) { }
            }
        }
        yield db_1.default.memory.delete({ where: { id } });
        res.json({ success: true, message: 'Memory deleted' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete memory' });
    }
});
exports.deleteMemory = deleteMemory;
