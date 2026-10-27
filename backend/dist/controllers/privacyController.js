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
exports.updatePrivacy = exports.getPrivacy = void 0;
const db_1 = __importDefault(require("../config/db"));
const getPrivacy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        let privacy = yield db_1.default.privacySetting.findUnique({ where: { userId } });
        if (!privacy) {
            privacy = yield db_1.default.privacySetting.create({
                data: { userId },
            });
        }
        res.json(privacy);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch privacy settings' });
    }
});
exports.getPrivacy = getPrivacy;
const updatePrivacy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { saveFaceImages, saveHistory, dataUsageConsent } = req.body;
    try {
        const updated = yield db_1.default.privacySetting.upsert({
            where: { userId },
            create: {
                userId,
                saveFaceImages: saveFaceImages !== undefined ? Boolean(saveFaceImages) : true,
                saveHistory: saveHistory !== undefined ? Boolean(saveHistory) : true,
                dataUsageConsent: dataUsageConsent !== undefined ? Boolean(dataUsageConsent) : false,
            },
            update: Object.assign(Object.assign(Object.assign({}, (saveFaceImages !== undefined && { saveFaceImages: Boolean(saveFaceImages) })), (saveHistory !== undefined && { saveHistory: Boolean(saveHistory) })), (dataUsageConsent !== undefined && { dataUsageConsent: Boolean(dataUsageConsent) })),
        });
        res.json({ success: true, privacy: updated });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update privacy settings' });
    }
});
exports.updatePrivacy = updatePrivacy;
