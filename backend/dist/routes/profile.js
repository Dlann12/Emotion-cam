"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profileController_1 = require("../controllers/profileController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, profileController_1.getProfile);
router.put('/', auth_1.authenticate, profileController_1.updateProfile);
exports.default = router;
