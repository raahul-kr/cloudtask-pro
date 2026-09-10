const express = require("express");

const {
  createProject,
  getProjects,
} = require("../controllers/project.controller");

const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// Create a project
router.post("/", authenticate, createProject);

// Get all projects in a workspace
router.get("/workspace/:workspaceId", authenticate, getProjects);

module.exports = router;