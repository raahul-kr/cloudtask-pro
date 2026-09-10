const express = require("express");
const {
  createWorkspace,
  getWorkspaces,
} = require("../controllers/workspace.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// Create a new workspace
router.post("/", authenticate, createWorkspace);

// Get workspaces for logged-in user
router.get("/", authenticate, getWorkspaces);

module.exports = router;