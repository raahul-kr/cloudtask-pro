const express = require("express");

const {
  createComment,
  getComments,
} = require("../controllers/comment.controller");

const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// Create a comment
router.post("/", authenticate, createComment);

// Get comments for a task
router.get("/task/:taskId", authenticate, getComments);

module.exports = router;