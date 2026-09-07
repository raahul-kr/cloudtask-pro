const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/protected", authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: "You accessed a protected route",
    user: req.user,
  });
});

module.exports = router;
