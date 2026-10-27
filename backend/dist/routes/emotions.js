"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const emotionController_1 = require("../controllers/emotionController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});
// Real-time detection route: supports both authenticated user and guest mode
router.post('/detect', auth_1.optionalAuth, upload.single('file'), emotionController_1.detectEmotion);
// Authenticated user actions
router.post('/save', auth_1.authenticate, emotionController_1.saveDetection);
router.get('/', auth_1.authenticate, emotionController_1.getHistory);
router.delete('/:id', auth_1.authenticate, emotionController_1.deleteDetection);
router.delete('/', auth_1.authenticate, emotionController_1.clearHistory);
exports.default = router;
