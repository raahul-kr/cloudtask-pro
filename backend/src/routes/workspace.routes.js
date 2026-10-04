const express = require("express");
const {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getMembers,
  addMember,
  updateMember,
  removeMember,
} = require("../controllers/workspace.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// Create a new workspace
router.post("/", authenticate, createWorkspace);

// Get workspaces for logged-in user
router.get("/", authenticate, getWorkspaces);
router.get("/:workspaceId/members", authenticate, getMembers);
router.post("/:workspaceId/members", authenticate, addMember);
router.patch("/:workspaceId/members/:userId", authenticate, updateMember);
router.delete("/:workspaceId/members/:userId", authenticate, removeMember);
router.get("/:workspaceId", authenticate, getWorkspace);
router.patch("/:workspaceId", authenticate, updateWorkspace);
router.delete("/:workspaceId", authenticate, deleteWorkspace);

module.exports = router;
