const express = require("express");

const {
  createTask,
  getTasks,
  updateTask,
} = require("../controllers/task.controller");

const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// Create a task
router.post("/", authenticate, createTask);

// Get all tasks in a project
router.get("/project/:projectId", authenticate, getTasks);

// Update a task
router.patch("/:taskId", authenticate, updateTask);

module.exports = router;