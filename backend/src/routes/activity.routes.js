const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { getActivity } = require("../controllers/activity.controller");
const router = express.Router();
router.use(authenticate);
router.get("/workspace/:workspaceId", getActivity);
router.get("/project/:projectId", getActivity);
router.get("/task/:taskId", getActivity);
module.exports = router;
