const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { upload } = require("../middleware/upload.middleware");
const { createAttachment, getAttachments, deleteAttachment } = require("../controllers/attachment.controller");

const router = express.Router();
router.post("/", authenticate, (req, res, next) => upload.single("file")(req, res, (error) => {
  if (error) return res.status(400).json({ message: error.code === "LIMIT_FILE_SIZE" ? "File must be 10 MB or smaller" : error.message });
  next();
}), createAttachment);
router.get("/task/:taskId", authenticate, getAttachments);
router.delete("/:attachmentId", authenticate, deleteAttachment);
module.exports = router;
