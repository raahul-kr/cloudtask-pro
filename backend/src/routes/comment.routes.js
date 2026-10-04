const express = require("express");

const {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} = require("../controllers/comment.controller");

const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// Create a comment
router.post("/", authenticate, createComment);

// Get comments for a task
router.get("/task/:taskId", authenticate, getComments);
router.patch("/:commentId", authenticate, updateComment);
router.delete("/:commentId", authenticate, deleteComment);

module.exports = router;
