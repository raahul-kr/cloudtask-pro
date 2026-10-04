const express = require("express");

const {
  createProject,
  getProjects,
  getProject,
} = require("../controllers/project.controller");

const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// Create a project
router.post("/", authenticate, createProject);

// Get all projects in a workspace
router.get("/workspace/:workspaceId", authenticate, getProjects);
router.get("/:projectId", authenticate, getProject);

module.exports = router;
