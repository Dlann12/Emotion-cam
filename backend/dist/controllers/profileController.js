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
exports.updateProfile = exports.getProfile = void 0;
const db_1 = __importDefault(require("../config/db"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const user = yield db_1.default.user.findUnique({
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
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
exports.getProfile = getProfile;
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { name, currentPassword, newPassword } = req.body;
    try {
        const updateData = {};
        if (name && name.trim()) {
            updateData.name = name.trim();
        }
        if (newPassword) {
            if (!currentPassword) {
                res.status(400).json({ error: 'Current password is required to change password' });
                return;
            }
            const currentUser = yield db_1.default.user.findUnique({ where: { id: userId } });
            if (!currentUser) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            const isValid = yield bcrypt_1.default.compare(currentPassword, currentUser.password);
            if (!isValid) {
                res.status(400).json({ error: 'Incorrect current password' });
                return;
            }
            updateData.password = yield bcrypt_1.default.hash(newPassword, 10);
        }
        const updatedUser = yield db_1.default.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, name: true, email: true, updatedAt: true },
        });
        res.json({ success: true, user: updatedUser });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
exports.updateProfile = updateProfile;
