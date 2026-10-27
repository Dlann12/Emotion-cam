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
exports.clearHistory = exports.deleteDetection = exports.getHistory = exports.saveDetection = exports.detectEmotion = void 0;
const db_1 = __importDefault(require("../config/db"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
function saveBase64Image(dataString) {
    try {
        const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return null;
        }
        const extension = matches[1].split('/')[1] || 'jpg';
        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = `face-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
        const uploadDir = path_1.default.join(process.cwd(), 'uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path_1.default.join(uploadDir, fileName);
        fs_1.default.writeFileSync(filePath, buffer);
        return `/uploads/${fileName}`;
    }
    catch (error) {
        console.error('Error saving image:', error);
        return null;
    }
}
const detectEmotion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let mlResponseData = null;
        if (req.file) {
            const formData = new FormData();
            const fileBlob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });
            formData.append('file', fileBlob, req.file.originalname || 'frame.jpg');
            const response = yield fetch(`${ML_SERVICE_URL}/predict`, {
                method: 'POST',
                body: formData,
            });
            mlResponseData = yield response.json();
        }
        else if (req.body.image) {
            const response = yield fetch(`${ML_SERVICE_URL}/predict-base64`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: req.body.image }),
            });
            mlResponseData = yield response.json();
        }
        else {
            res.status(400).json({ error: 'No image provided. Send a file or base64 image.' });
            return;
        }
        if (!mlResponseData || !mlResponseData.success) {
            res.status(502).json({
                error: (mlResponseData === null || mlResponseData === void 0 ? void 0 : mlResponseData.error) || 'ML Service failed to process the image',
                faces: [],
            });
            return;
        }
        // Auto-save detection if user is logged in and requested or configured
        let savedRecordId = null;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const shouldAutoSave = req.query.autoSave === 'true' || req.body.autoSave === true;
        if (userId && shouldAutoSave && mlResponseData.faces.length > 0) {
            const privacy = yield db_1.default.privacySetting.findUnique({ where: { userId } });
            if (!privacy || privacy.saveHistory !== false) {
                const primaryFace = mlResponseData.faces[0];
                let savedImageUrl = null;
                if ((privacy === null || privacy === void 0 ? void 0 : privacy.saveFaceImages) !== false && req.body.image) {
                    savedImageUrl = saveBase64Image(req.body.image);
                }
                const record = yield db_1.default.emotionDetection.create({
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
    }
    catch (err) {
        console.error('Detection error:', err);
        res.status(500).json({ error: 'Internal server error during detection', message: err.message });
    }
});
exports.detectEmotion = detectEmotion;
const saveDetection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
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
        const privacy = yield db_1.default.privacySetting.findUnique({ where: { userId } });
        let savedImageUrl = null;
        if ((privacy === null || privacy === void 0 ? void 0 : privacy.saveFaceImages) !== false && image) {
            savedImageUrl = saveBase64Image(image);
        }
        const detection = yield db_1.default.emotionDetection.create({
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
    }
    catch (err) {
        console.error('Save detection error:', err);
        res.status(500).json({ error: 'Failed to save detection' });
    }
});
exports.saveDetection = saveDetection;
const getHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const emotionFilter = req.query.emotion;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
    const where = { userId };
    if (emotionFilter) {
        where.emotion = emotionFilter;
    }
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate)
            where.createdAt.gte = startDate;
        if (endDate)
            where.createdAt.lte = endDate;
    }
    try {
        const [total, detections] = yield Promise.all([
            db_1.default.emotionDetection.count({ where }),
            db_1.default.emotionDetection.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    emotionScores: true,
                },
            }),
        ]);
        const formatted = detections.map((d) => (Object.assign(Object.assign({}, d), { bbox: typeof d.bbox === 'string' ? JSON.parse(d.bbox) : d.bbox })));
        res.json({
            data: formatted,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (err) {
        console.error('Get history error:', err);
        res.status(500).json({ error: 'Failed to fetch detection history' });
    }
});
exports.getHistory = getHistory;
const deleteDetection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const id = req.params.id;
    if (!userId || !id) {
        res.status(401).json({ error: 'Unauthorized or missing ID' });
        return;
    }
    try {
        const existing = yield db_1.default.emotionDetection.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            res.status(404).json({ error: 'Detection not found' });
            return;
        }
        if (existing.imageUrl && existing.imageUrl.startsWith('/uploads/')) {
            const fullPath = path_1.default.join(process.cwd(), existing.imageUrl);
            if (fs_1.default.existsSync(fullPath)) {
                try {
                    fs_1.default.unlinkSync(fullPath);
                }
                catch (_b) { }
            }
        }
        yield db_1.default.emotionDetection.delete({ where: { id } });
        res.json({ success: true, message: 'Detection deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete detection' });
    }
});
exports.deleteDetection = deleteDetection;
const clearHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        yield db_1.default.emotionDetection.deleteMany({ where: { userId } });
        res.json({ success: true, message: 'All detection history cleared' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to clear history' });
    }
});
exports.clearHistory = clearHistory;
