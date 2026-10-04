const express = require("express");
const { register, login, refresh, logout, me, updateMe } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { rateLimit } = require("../middleware/rate-limit.middleware");
const authLimiter = rateLimit({ maxRequests: 10, windowSeconds: 60, keyPrefix: "auth" });

const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);
router.patch("/me", authenticate, updateMe);

module.exports = router;
