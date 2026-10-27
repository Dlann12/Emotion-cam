"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const privacyController_1 = require("../controllers/privacyController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, privacyController_1.getPrivacy);
router.put('/', auth_1.authenticate, privacyController_1.updatePrivacy);
exports.default = router;
