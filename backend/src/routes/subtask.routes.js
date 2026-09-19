const express = require("express");

const {
  createSubtask,
  getSubtasks,
} = require("../controllers/subtask.controller");

const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// Create a subtask
router.post("/", authenticate, createSubtask);

// Get subtasks for a task
router.get("/task/:taskId", authenticate, getSubtasks);

module.exports = router;