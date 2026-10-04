const express = require("express");

const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
} = require("../controllers/project.controller");

const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// Create a project
router.post("/", authenticate, createProject);

// Get all projects in a workspace
router.get("/workspace/:workspaceId", authenticate, getProjects);
router.get("/:projectId/members", authenticate, getProjectMembers);
router.post("/:projectId/members", authenticate, addProjectMember);
router.patch("/:projectId/members/:userId", authenticate, updateProjectMember);
router.delete("/:projectId/members/:userId", authenticate, removeProjectMember);
router.get("/:projectId", authenticate, getProject);
router.patch("/:projectId", authenticate, updateProject);
router.delete("/:projectId", authenticate, deleteProject);

module.exports = router;
